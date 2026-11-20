const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Playlist, PlaylistSong, Song, User, sequelize } = require('../../src/models');
const service = require('../../src/services/playlist.service');
const auth = require('../../src/services/auth.service');
const fetch = require('../helpers/browser-fetch.cjs');

module.exports = async function playlistConcurrency(t) {
  const server = require('../../src/app').createApp().listen(0, '127.0.0.1');
  await once(server, 'listening'); t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/playlists`;
  const credentials = async (id) => (await auth.loginUser({ username: (await User.findByPk(id)).username, password: process.env.TEST_SEED_PASSWORD })).tokens.accessToken;
  const owner = await credentials(1), other = await credentials(2);
  const request = (path, method, token = owner, body) => fetch(base + path, { method, headers: { Cookie: `accessToken=${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const add = (id, songId, token = owner) => request(`/${id}/songs`, 'POST', token, { songId });
  const create = async () => service.createPlaylist(1, 'T09 concurrency fixture', 'Synthetic');
  const rows = async (id) => (await PlaylistSong.findAll({ where: { playlist_id: id }, order: [['position', 'ASC']], raw: true })).map(({ song_id, position }) => ({ song_id, position }));
  const songIds = Array.from({ length: 12 }, (_, index) => 1001 + index);
  await Song.bulkCreate(songIds.map((song_id) => ({ song_id, title: `T09 fixture ${song_id}`, audio_url: `https://media.example.test/t09/${song_id}.wav`, status: 'approved', is_visible: true })));

  await t.test('12 concurrent adds on an empty playlist all commit with unique positions1..12', async () => {
    const playlist = await create();
    const responses = await Promise.all(songIds.map((id) => add(playlist.playlist_id, id)));
    assert.ok(responses.every((response) => response.status === 200));
    const data = await rows(playlist.playlist_id);
    assert.deepEqual(data.map((row) => row.position), Array.from({ length: 12 }, (_, i) => i + 1));
    assert.deepEqual(data.map((row) => row.song_id).sort(), [...songIds].sort());
  });

  await t.test('eight same-song concurrent adds produce one200 and seven409 without position changes', async () => {
    const playlist = await create();
    const responses = await Promise.all(Array.from({ length: 8 }, () => add(playlist.playlist_id, 1001)));
    assert.equal(responses.filter((res) => res.status === 200).length, 1);
    const conflicts = responses.filter((res) => res.status === 409);
    assert.equal(conflicts.length, 7);
    for (const res of conflicts) assert.equal((await res.json()).error.code, 'PLAYLIST_SONG_EXISTS');
    assert.deepEqual(await rows(playlist.playlist_id), [{ song_id: 1001, position: 1 }]);
  });

  await t.test('unauthorized/hidden/pending/rejected/deleted adds do not change parent or joins', async () => {
    const playlist = await create(); await service.addSongToPlaylist(1, playlist.playlist_id, 1001);
    const before = await rows(playlist.playlist_id), parent = (await Playlist.findByPk(playlist.playlist_id)).toJSON();
    assert.equal((await add(playlist.playlist_id, 1002, other)).status, 404);
    assert.equal((await request(`/${playlist.playlist_id}/songs/1001`, 'DELETE', other)).status, 404);
    assert.equal((await request(`/${playlist.playlist_id}`, 'DELETE', other)).status, 404);
    for (const [status, is_visible] of [['approved', false], ['pending', true], ['rejected', true]]) {
      await Song.update({ status, is_visible }, { where: { song_id: 1002 } });
      assert.equal((await add(playlist.playlist_id, 1002)).status, 404);
    }
    assert.equal((await add(playlist.playlist_id, 999999)).status, 404);
    assert.deepEqual(await rows(playlist.playlist_id), before);
    assert.deepEqual((await Playlist.findByPk(playlist.playlist_id)).toJSON(), parent);
    await Song.update({ status: 'approved', is_visible: true }, { where: { song_id: 1002 } });
  });

  await t.test('insert failure AFTER writing rolls back the row and reuses the next position', async (context) => {
    const playlist = await create(); await service.addSongToPlaylist(1, playlist.playlist_id, 1001);
    const original = PlaylistSong.create.bind(PlaylistSong);
    const insert = context.mock.method(PlaylistSong, 'create', async (...args) => { await original(...args); throw new Error('synthetic failure after insert'); });
    assert.equal((await add(playlist.playlist_id, 1002)).status, 500);
    insert.mock.restore();
    assert.deepEqual(await rows(playlist.playlist_id), [{ song_id: 1001, position: 1 }]);
    assert.equal((await add(playlist.playlist_id, 1002)).status, 200);
    assert.deepEqual((await rows(playlist.playlist_id)).map((row) => row.position), [1, 2]);
  });

  await t.test('parent-delete failure rolls back the already deleted joins; successful delete removes everything', async (context) => {
    const playlist = await create(); await service.addSongToPlaylist(1, playlist.playlist_id, 1001);
    const before = await rows(playlist.playlist_id);
    const remove = context.mock.method(Playlist.prototype, 'destroy', async () => { throw new Error('synthetic parent deletion failure'); });
    assert.equal((await request(`/${playlist.playlist_id}`, 'DELETE')).status, 500);
    remove.mock.restore();
    assert.deepEqual(await rows(playlist.playlist_id), before);
    assert.ok(await Playlist.findByPk(playlist.playlist_id));
    assert.equal((await request(`/${playlist.playlist_id}`, 'DELETE')).status, 200);
    assert.equal(await Playlist.findByPk(playlist.playlist_id), null);
    assert.deepEqual(await rows(playlist.playlist_id), []);
  });

  await t.test('concurrent add/delete is serialized and leaves no orphan joins', async () => {
    const playlist = await create(); await service.addSongToPlaylist(1, playlist.playlist_id, 1001);
    const [added, removed] = await Promise.all([add(playlist.playlist_id, 1002), request(`/${playlist.playlist_id}`, 'DELETE')]);
    assert.ok([200, 404].includes(added.status)); assert.equal(removed.status, 200);
    assert.equal(await Playlist.findByPk(playlist.playlist_id), null);
    assert.deepEqual(await rows(playlist.playlist_id), []);
  });

  await t.test('concurrent add/remove preserves survivor and owner can remove a hidden existing song', async () => {
    const playlist = await create(); await service.addSongToPlaylist(1, playlist.playlist_id, 1001);
    const responses = await Promise.all([add(playlist.playlist_id, 1002), request(`/${playlist.playlist_id}/songs/1001`, 'DELETE')]);
    assert.ok(responses.every((response) => response.status === 200));
    const remaining = await rows(playlist.playlist_id); assert.equal(remaining.length, 1); assert.equal(remaining[0].song_id, 1002);
    await Song.update({ is_visible: false }, { where: { song_id: 1002 } });
    assert.equal((await request(`/${playlist.playlist_id}/songs/1002`, 'DELETE')).status, 200);
    assert.equal((await request(`/${playlist.playlist_id}/songs/1002`, 'DELETE')).status, 200); // absent removal is idempotent
    assert.deepEqual(await rows(playlist.playlist_id), []);
    await Song.update({ is_visible: true }, { where: { song_id: 1002 } });
  });

  await t.test('locking one playlist does not block unrelated playlist mutations', async () => {
    const a = await create(), b = await create();
    let unlock, entered;
    const gate = new Promise((resolve) => { unlock = resolve; }), ready = new Promise((resolve) => { entered = resolve; });
    const held = sequelize.transaction(async (transaction) => { await Playlist.findByPk(a.playlist_id, { transaction, lock: transaction.LOCK.UPDATE }); entered(); await gate; });
    await ready;
    try { assert.equal((await add(b.playlist_id, 1001)).status, 200); }
    finally { unlock(); await held; }
  });

  await t.test('publication is checked with a current locking read after a moderator commits', async () => {
    const playlist = await create(); let unlock, entered;
    const gate = new Promise((resolve) => { unlock = resolve; }), ready = new Promise((resolve) => { entered = resolve; });
    const moderator = sequelize.transaction(async (transaction) => {
      const song = await Song.findByPk(1002, { transaction, lock: transaction.LOCK.UPDATE });
      await song.update({ is_visible: false }, { transaction }); entered(); await gate;
    });
    await ready;
    const attempt = add(playlist.playlist_id, 1002);
    unlock(); await moderator;
    assert.equal((await attempt).status, 404); assert.deepEqual(await rows(playlist.playlist_id), []);
    await Song.update({ is_visible: true }, { where: { song_id: 1002 } });
  });
};
