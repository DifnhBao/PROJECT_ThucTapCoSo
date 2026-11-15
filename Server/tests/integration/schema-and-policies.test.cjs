const fetch = require("../helpers/browser-fetch.cjs");
const { fetchPayload } = require("../helpers/fetch-payload.cjs");
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const { getTestDatabaseConfig } = require('../../config/test-database');
getTestDatabaseConfig(process.env, { destructive: true });
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { seed } = require('../../database/seed.cjs');
const resetDatabase = require('../helpers/reset-test-database.cjs');
let db, server, baseUrl;
function migrate() {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/db-migrate.cjs'), '--env', 'test'], { env: process.env, encoding: 'utf8' });
  // Output includes migration names only; suppress any connection error detail.
  assert.equal(result.status, 0, 'Migration process must succeed');
  return result.stdout;
}
const actorAccess = {};
const cookie = (userId, role = 'user') => ({ Cookie: `${role === 'user' ? 'accessToken' : 'accessToken_admin'}=${actorAccess[userId] || jwt.sign({ userId, role, sessionId: `00000000-0000-4000-8000-${String(userId).padStart(12, '0')}`, scope: role === 'user' ? 'user' : 'admin' }, process.env.JWT_SECRET)}` });
const request = (url, options = {}) => fetchPayload(baseUrl + url, { ...options, signal: AbortSignal.timeout(10000) });
before(async () => {
  await resetDatabase();
  db = new Sequelize(getTestDatabaseConfig());
  const [[version]] = await db.query('SELECT VERSION() AS version');
  console.log(`MySQL ${version.version}; isolated test database; no Cloudinary calls`);
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await require('../../src/models').sequelize.close();
  if (db) await db.close();
});

test('AT05: empty MySQL -> migrations -> seed; repeat migration stable and repeat seed refused', async () => {
  migrate();
  const q = db.getQueryInterface();
  const first = (await q.showAllTables()).sort();
  assert.match(migrate(), /No migrations were executed/);
  assert.deepEqual((await q.showAllTables()).sort(), first);
  assert.equal((await seed('test')).songs, 28);
  await assert.rejects(seed('test'), /Seed refused/);
  const [[counts]] = await db.query('SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM songs) AS songs');
  assert.deepEqual([Number(counts.users), Number(counts.songs)], [5, 28]);
});

test('all model columns match MySQL types, nullability, primary keys, business indexes and foreign keys', async () => {
  const models = require('../../src/models');
  const q = db.getQueryInterface();
  for (const model of Object.values(models).filter((item) => item?.rawAttributes)) {
    const actual = await q.describeTable(model.tableName);
    const fields = Object.values(model.rawAttributes).map((attr) => attr.field);
    assert.deepEqual(Object.keys(actual).sort(), fields.sort(), model.tableName);
    for (const attr of Object.values(model.rawAttributes)) {
      const column = actual[attr.field];
      assert.equal(column.primaryKey, Boolean(attr.primaryKey), `${model.tableName}.${attr.field} PK`);
      if (attr.allowNull === false) assert.equal(column.allowNull, false, `${model.tableName}.${attr.field} NOT NULL`);
      const key = attr.type.key;
      const type = column.type.toUpperCase();
      const expected = { INTEGER: /^INT/, BIGINT: /^BIGINT/, SMALLINT: /^SMALLINT/, TINYINT: /^TINYINT/, FLOAT: /^FLOAT/, BOOLEAN: /^TINYINT\(1\)/, STRING: new RegExp(`^VARCHAR\\(${attr.type.options?.length}\\)`), TEXT: /TEXT$/, DATE: /^DATETIME/, DATEONLY: /^DATE$/, JSON: /^JSON$/, ENUM: /^ENUM\(/ }[key];
      assert.ok(expected && expected.test(type), `${model.tableName}.${attr.field}: ${key} vs ${type}`);
    }
  }
  for (const [table, indexes] of Object.entries(require('../../database/schema-v1.cjs').indexes)) {
    const actual = await q.showIndex(table);
    for (const [fields, , unique = false] of indexes) assert.ok(actual.some((index) => (!unique || index.unique) && index.fields.map((field) => field.attribute).join(',') === fields.join(',')), `${table}: index ${fields}`);
  }
  for (const [table, columns] of Object.entries(require('../../database/schema-v1.cjs')(Sequelize))) {
    const actual = await q.getForeignKeyReferencesForTable(table);
    for (const [column, definition] of Object.entries(columns)) if (definition.references) assert.ok(actual.some((fk) => fk.columnName === column && fk.referencedTableName === definition.references.model && fk.referencedColumnName === definition.references.key), `${table}.${column} FK`);
  }
  await assert.rejects(db.query("INSERT INTO playlist_songs(playlist_id,song_id,position) VALUES(1,2,1)"), { name: 'SequelizeUniqueConstraintError' });
  await assert.rejects(db.query("INSERT INTO favorites(user_id,song_id) VALUES(9999,1)"), { name: 'SequelizeForeignKeyConstraintError' });
  await assert.rejects(db.query("INSERT INTO song_similarities(song_id_1,song_id_2) VALUES(1,2)"), { name: 'SequelizeUniqueConstraintError' });
});

test('T01/T02: real HTTP + MySQL enforce authorization, publication, playlist privacy and top-K', async () => {
  server = require('../../src/app').createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const models = require('../../src/models');
  for (const [user_id, scope] of [[1, 'user'], [2, 'user'], [3, 'admin'], [4, 'admin'], [5, 'user']]) {
    await models.RefreshToken.create({ user_id, token: String(user_id).repeat(64), family_id: `00000000-0000-4000-8000-${String(user_id).padStart(12, '0')}`, scope, expires_at: new Date('2030-01-01T00:00:00Z') });
  }
  const before = await models.User.findByPk(4);
  const tokensBefore = await models.RefreshToken.count();
  assert.equal((await request('/users/4/reset-password', { method: 'PUT', headers: { ...cookie(3, 'admin'), 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: process.env.TEST_SEED_PASSWORD }) })).status, 403);
  assert.equal((await models.User.findByPk(4)).password, before.password);
  assert.equal(await models.RefreshToken.count(), tokensBefore);
  assert.equal((await request('/users/3/reset-password', { method: 'PUT', headers: { ...cookie(3, 'admin'), 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: process.env.TEST_SEED_PASSWORD }) })).status, 403);
  assert.equal((await request('/recommendations/me')).status, 401);
  assert.equal((await request('/recommendations/users/2', { headers: cookie(1) })).status, 404);
  assert.equal((await request('/users/profile/2', { headers: cookie(1) })).status, 403);
  const playlistBefore = await models.PlaylistSong.count({ where: { playlist_id: 2 } });
  assert.equal((await request('/playlists/2/songs', { method: 'POST', headers: { ...cookie(1), 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: 2 }) })).status, 404);
  assert.equal(await models.PlaylistSong.count({ where: { playlist_id: 2 } }), playlistBefore);
  for (const id of [26, 27, 28, 999]) assert.equal((await request(`/songs/${id}`)).status, 404);
  assert.equal((await request('/songs/admin/26', { headers: cookie(3, 'admin') })).status, 200);
  const listing = await (await request('/songs?limit=100')).json();
  assert.equal(listing.total, 25);
  assert.equal(listing.songs.length, 25);
  const search = await request('/songs/search?q=Synthetic&limit=100');
  assert.equal(search.status, 200);
  assert.equal(JSON.stringify(await search.json()).includes('audio/26.mp3'), false);
  assert.equal((await request('/playlists/2')).status, 404);
  assert.equal((await request('/playlists/2', { headers: cookie(1) })).status, 404);
  for (const headers of [cookie(2), cookie(3, 'admin')]) assert.equal((await request('/playlists/2', { headers })).status, 200);
  const playlist = await (await request('/playlists/1')).json();
  assert.deepEqual(playlist.data.songs.map((song) => song.song_id), [1]);
  const favorite = await (await request('/favorites/me', { headers: cookie(1) })).json();
  assert.deepEqual(favorite.data.map((row) => row.song.song_id), [1]);
  for (const id of [26, 27, 28]) {
    assert.equal((await request(`/ratings/song/${id}/summary`)).status, 404);
    assert.equal((await request(`/songs/${id}/view`, { method: 'POST', headers: cookie(1) })).status, 404);
    assert.equal((await request('/playlists/1/songs', { method: 'POST', headers: { ...cookie(1), 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: id }) })).status, 404);
  }
  for (const endpoint of ['/artists', '/artists/top', '/artists/1']) {
    const response = await request(endpoint);
    assert.equal(response.status, 200);
    assert.equal(/audio\/(26|27|28)\.mp3/.test(JSON.stringify(await response.json())), false);
  }
  assert.equal((await request('/recommendations/debug/song-pair?songA=1&songB=26', { headers: cookie(1) })).status, 403);
  const similar = await request('/recommendations/songs/1/similar?limit=2');
  assert.equal(similar.status, 200);
  const result = (await similar.json()).data;
  assert.deepEqual(result, []); // Legacy rows are not an active v1 snapshot. T14 tests publication after rebuild.
  assert.ok(result.every((row) => row.detail === undefined));
  const cold = await request('/recommendations/me?limit=2', { headers: cookie(5) });
  assert.equal(cold.status, 200);
  const coldData = (await cold.json()).data;
  assert.equal(coldData.length, 2);
  assert.ok(coldData.every((row) => row.song.song_id <= 25));
  assert.ok(await bcrypt.compare(process.env.TEST_SEED_PASSWORD, (await models.User.findByPk(1)).password));
  assert.equal((await request('/users/1/reset-password', { method: 'PUT', headers: { ...cookie(3, 'admin'), 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: process.env.TEST_SEED_PASSWORD }) })).status, 200);
  actorAccess[1] = (await require('../../src/services/auth.service').loginUser({ username: 'demo_userA', password: process.env.TEST_SEED_PASSWORD })).tokens.accessToken; // New login after reset; never resurrect a revoked family.
  // T05: genuine MySQL conflicts and parsed request errors use the public contract.
  const duplicate = await fetch(baseUrl + '/playlists/1/songs', { method: 'POST', headers: { ...cookie(1), 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: 1 }) });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'PLAYLIST_SONG_EXISTS');
  const emailConflict = await fetch(baseUrl + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'synthetic_collision', email: 'usera@example.test', password: process.env.TEST_SEED_PASSWORD }) });
  assert.equal(emailConflict.status, 409);
  const conflictBody = await emailConflict.json();
  assert.equal(conflictBody.error.code, 'DUPLICATE_RESOURCE');
  assert.equal(JSON.stringify(conflictBody).includes('usera@example.test'), false);
  assert.equal(await models.User.count(), 5);
  const login = await fetch(baseUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo_userA', password: process.env.TEST_SEED_PASSWORD }) });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.data.data.user.user_id, 1);
  assert.equal((await request('/users/me', { headers: { Cookie: `accessToken=${loginBody.data.data.tokens.accessToken}` } })).status, 200);
  for (const endpoint of ['/songs/-1', '/songs?limit=1000000', '/songs/search?q[]=invalid']) {
    const invalid = await fetch(baseUrl + endpoint);
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
  }
  await models.Song.update({ status: 'pending' }, { where: {} });
  assert.equal((await (await request('/songs')).json()).total, 0);
  const empty = await (await request('/recommendations/me?limit=2', { headers: cookie(5) })).json();
  assert.deepEqual(empty.data, []);
});

test('T06: session lifecycle on real MySQL', async (t) => { await require('./session-lifecycle.cjs')(t, baseUrl); });

test('T08: upload lifecycle on real MySQL with mocked storage provider', { timeout: 120000 }, async (t) => { await require('./upload-lifecycle.cjs')(t); });

test('T11: durable listening events on real MySQL', { timeout: 120000 }, async (t) => { await require('./listening-events.cjs')(t); });

test('T09: playlist concurrency and rollback on real MySQL', { timeout: 120000 }, async (t) => { await require('./playlist-concurrency.cjs')(t); });

if (process.env.T07_BROWSER_TESTS === 'yes') {
  test('real browser cookies, hostile mutation and optional T08 media playback', async (t) => {
    if (process.env.T08_BROWSER_UPLOAD === 'yes') {
      const storage = require('../../src/storage/cloudinary');
      t.mock.method(storage, 'upload', async () => {});
      t.mock.method(storage, 'destroy', async () => {});
      t.mock.method(storage, 'read', async () => new Response(require('../helpers/media-fixtures.cjs').wav(), { headers: { 'Content-Type': 'audio/wav' } }));
    }
    const result = await require('./browser-security.cjs')();
    const output = path.resolve(__dirname, '../../..', process.env.SECURITY_EVIDENCE_DIR || `docs/verification/evidence/${process.env.T08_BROWSER_UPLOAD === 'yes' ? 'T08' : 'T07'}`);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify(result, null, 2));
  });
}

test('T14: snapshots, publication, concurrency and query budget on MySQL', { timeout: 180000 }, async (t) => {
  await resetDatabase(); migrate(); await seed('test');
  await require('./recommendation-snapshots.cjs')(t);
});

test('forward migration preserves legacy partitioned activities and refuses unsafe/untracked legacy data', async () => {
  await resetDatabase();
  const q = db.getQueryInterface();
  const legacyDir = path.resolve(__dirname, '../../migrations/legacy');
  const names = fs.readdirSync(legacyDir).filter((name) => name.endsWith('.js')).sort();
  await q.createTable('SequelizeMeta', { name: { type: DataTypes.STRING, primaryKey: true } });
  for (const name of names) {
    await require(path.join(legacyDir, name)).up(q, Sequelize);
    await q.bulkInsert('SequelizeMeta', [{ name }]);
  }
  await q.bulkInsert('users', [{ user_id: 7, username: 'legacy_synthetic', email: 'legacy@example.test', password: 'synthetic-not-used', role: 'user' }]);
  await q.bulkInsert('refresh_tokens', [{ user_id: 7, token: 'legacy-raw-token-to-invalidate', expires_at: new Date('2030-01-01') }]);
  await q.bulkInsert('songs', [{ song_id: 7, title: 'Legacy synthetic', audio_url: 'https://media.example.test/legacy.mp3' }]);
  await q.bulkInsert('UserActivities', [{ id: 42, user_id: 7, song_id: 7, session_id: 'legacy', source: 'search', song_duration: 180, total_listened_time: 60, created_at: new Date('2026-01-15T00:00:00Z') }]);
  const [[before]] = await db.query('SELECT * FROM UserActivities WHERE id=42');
  await q.bulkInsert('UserActivities', [{ id: 43, user_id: 9999, song_id: 7, session_id: 'orphan-fixture', source: 'search', song_duration: 180, total_listened_time: 60, created_at: new Date('2026-01-15T00:00:00Z') }]);
  assert.throws(migrate, /Migration process must succeed/);
  const [[preserved]] = await db.query('SELECT COUNT(*) AS n FROM UserActivities');
  assert.equal(Number(preserved.n), 2);
  const [stillPartitioned] = await db.query("SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='UserActivities' AND PARTITION_NAME IS NOT NULL");
  assert.ok(stillPartitioned.length > 0);
  await db.query('DELETE FROM UserActivities WHERE id=43'); // Only our intentionally invalid fixture.
  migrate();
  const [[sessionsAfter]] = await db.query('SELECT COUNT(*) AS n FROM refresh_tokens');
  assert.equal(Number(sessionsAfter.n), 0);
  const [[after]] = await db.query('SELECT * FROM UserActivities WHERE id=42');
  assert.deepEqual(Object.fromEntries(Object.keys(before).map((key) => [key, after[key]])), before);
  assert.equal(after.event_id, null); assert.equal(after.qualified, 0);
  const [partitions] = await db.query("SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='UserActivities'");
  assert.ok(partitions.every((row) => row.PARTITION_NAME === null));
  assert.equal((await q.describeTable('UserActivities')).created_at.primaryKey, false);
  assert.match(migrate(), /No migrations were executed/);
  await resetDatabase();
  await q.createTable('unexpected', { id: DataTypes.INTEGER });
  assert.throws(migrate, /Migration process must succeed/);
  assert.ok((await q.showAllTables()).includes('unexpected'));
});
