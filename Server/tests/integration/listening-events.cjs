const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { fork } = require('node:child_process');
const path = require('node:path');
const models = require('../../src/models');
const { Song, User, UserActivity, sequelize } = models;
const fetch = require('../helpers/browser-fetch.cjs');

module.exports = async function listeningEvents(t) {
  const server = require('../../src/app').createApp().listen(0, '127.0.0.1');
  await once(server, 'listening'); t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const login = async (id) => (await require('../../src/services/auth.service').loginUser({ username: (await User.findByPk(id)).username, password: process.env.TEST_SEED_PASSWORD })).tokens.accessToken;
  const tokens = { 1: await login(1), 2: await login(2) };
  const songs = [];
  for (const duration of [60, 10, 0]) songs.push(await Song.create({ title: `T11 synthetic ${duration}`, duration, audio_url: 'https://media.example.test/synthetic.mp3', status: 'approved', is_visible: true, uploaded_by: 1, view_count: 0 }));
  const event = (change = {}) => ({ event_version: 1, session_id: randomUUID(), song_id: songs[0].song_id, source: 'search', exit_reason: 'ended', song_duration: 60, total_listened_time: 25, max_position_reached: 25, play_pause_count: 1, seek_count: 0, ...change });
  const post = (body, user = 1, origin = base) => fetch(origin + '/activity', { method: 'POST', headers: { Cookie: `accessToken=${tokens[user]}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const views = async () => Number((await songs[0].reload()).view_count);
  let saved;
  await t.test('201 commits activity, canonical duration and view; identical replay200, changed payload409', async () => {
    saved = event({ song_duration: 99 }); const initial = await views();
    const first = await post(saved); assert.equal(first.status, 201); const a = (await first.json()).data;
    assert.equal(a.qualified, true); assert.equal(a.song_duration, 60); assert.equal(a.duplicate, false);
    const second = await post(saved); assert.equal(second.status, 200); const b = (await second.json()).data;
    assert.equal(b.activity_id, a.activity_id); assert.equal(b.duplicate, true);
    const conflict = await post({ ...saved, source: 'recommendation' }); assert.equal(conflict.status, 409); assert.equal((await conflict.json()).error.code, 'ACTIVITY_CONFLICT');
    assert.equal(await UserActivity.count({ where: { user_id: 1, event_id: saved.session_id } }), 1); assert.equal(await views(), initial + 1);
  });
  await t.test('8 simultaneous copies commit one activity and one aggregate increment', async () => {
    const body = event(), initial = await views();
    const responses = await Promise.all(Array.from({ length: 8 }, () => post(body)));
    assert.equal(responses.filter((r) => r.status === 201).length, 1); assert.equal(responses.filter((r) => r.status === 200).length, 7);
    assert.equal(await UserActivity.count({ where: { user_id: 1, event_id: body.session_id } }), 1); assert.equal(await views(), initial + 1);
  });
  await t.test('UUID is scoped to authenticated user; new UUID counts another repeated session', async () => {
    const initial = await views(); assert.equal((await post(saved, 2)).status, 201);
    assert.equal((await post({ ...saved, session_id: randomUUID() })).status, 201); assert.equal(await views(), initial + 2);
  });
  await t.test('seek-end and short/unknown duration events persist without qualified views', async () => {
    const initial = await views(); const body = event({ total_listened_time: 0.1, max_position_reached: 60, seek_count: 1 });
    const seek = await post(body); assert.equal(seek.status, 201); assert.equal((await seek.json()).data.qualified, false); assert.equal(await views(), initial);
    for (const song of songs.slice(1)) {
      const response = await post(event({ song_id: song.song_id, song_duration: 60, max_position_reached: 9, total_listened_time: 9 })); assert.equal(response.status, 201); assert.equal((await response.json()).data.qualified, false); assert.equal(Number((await song.reload()).view_count), 0);
    }
  });
  await t.test('invalid identity/version/counters/UUID/ranges reject separately; hidden/absent songs404', async () => {
    const before = await UserActivity.count();
    for (const patch of [{ user_id: 2 }, { created_at: '2026-01-01' }, { event_version: 2 }, { session_id: 'bad' }, { total_listened_time: -1 }, { seek_count: 0.5 }, { source: 'forged' }, { max_position_reached: 61 }]) assert.equal((await post(event(patch))).status, 400);
    assert.equal((await post(event({ song_duration: 99, max_position_reached: 90 }))).status, 422);
    for (const id of [26, 27, 28, 2147483647]) assert.equal((await post(event({ song_id: id }))).status, 404);
    assert.equal(await UserActivity.count(), before); assert.equal((await post(event())).status, 201);
  });
  await t.test('aggregate write failure rolls back the already inserted activity; same event can recover', async (sub) => {
    const body = event(), initial = await views();
    const original = Song.increment; const mock = sub.mock.method(Song, 'increment', async () => { throw new Error('injected aggregate failure'); });
    assert.equal((await post(body)).status, 500);
    assert.equal(await UserActivity.count({ where: { event_id: body.session_id } }), 0); assert.equal(await views(), initial);
    mock.mock.restore(); assert.equal(Song.increment, original); assert.equal((await post(body)).status, 201); assert.equal(await views(), initial + 1);
  });
  await t.test('DB transaction unavailable returns500, never queued success', async (sub) => {
    const mock = sub.mock.method(sequelize, 'transaction', async () => { throw new Error('database unavailable'); });
    const response = await post(event()); assert.equal(response.status, 500); assert.equal((await response.json()).error.code, 'INTERNAL_ERROR'); mock.mock.restore();
  });
  await t.test('commit succeeded but response lost: retry200 without another increment', async (sub) => {
    const body = event(), initial = await views(), original = sequelize.transaction.bind(sequelize);
    const mock = sub.mock.method(sequelize, 'transaction', async (...args) => { await original(...args); throw new Error('injected lost commit acknowledgement'); });
    assert.equal((await post(body)).status, 500); mock.mock.restore();
    assert.equal((await post(body)).status, 200); assert.equal(await views(), initial + 1);
  });
  await t.test('legacy view endpoint is410 and cannot increment the aggregate', async () => {
    const initial = await views(); const response = await fetch(`${base}/songs/${songs[0].song_id}/view`, { method: 'POST', headers: { Cookie: `accessToken=${tokens[1]}` } });
    assert.equal(response.status, 410); assert.equal((await response.json()).error.code, 'VIEW_ENDPOINT_RETIRED'); assert.equal(await views(), initial);
  });
  await t.test('ACK survives terminating and restarting an actual API process', async () => {
    const boot = async () => {
      const child = fork(path.join(__dirname, '../helpers/activity-api-process.cjs'), [], { env: process.env, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      const ready = await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error('API process exited before ready'); })]);
      return { child, url: `http://127.0.0.1:${ready[0].port}/api` };
    };
    const body = event(), initial = await views();
    let api = await boot();
    try { assert.equal((await post(body, 1, api.url)).status, 201); } finally { const ended = once(api.child, 'exit'); api.child.kill(); await ended; }
    api = await boot();
    try { assert.equal((await post(body, 1, api.url)).status, 200); assert.equal(await views(), initial + 1); } finally { const ended = once(api.child, 'exit'); api.child.kill(); await ended; }
  });
};
