import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import httpServer from 'node:http';
import { once } from 'node:events';
import http from '../../app/lib/http.ts';
import { ActivityDelivery } from '../../app/features/player/activityDelivery.ts';
import { beginAuthChange, discoverAuth, getAuth, setPrincipal, toUser } from '../../app/lib/auth-state.ts';
import { uploadKey } from '../../app/lib/upload-key.ts';
beforeEach(() => discoverAuth('user'));
const event = { event_version: 1, session_id: '10000000-0000-4000-8000-000000000001', song_id: 1, source: 'search', exit_reason: 'ended', song_duration: 60, total_listened_time: 25, max_position_reached: 25, play_pause_count: 1, seek_count: 0 };
test('native fetch multipart and listening UUID survive401 replay through the real shared adapters', async (t) => {
  let authenticated = false, refreshes = 0, commits = 0;
  const uploads = [], activities = [];
  const server = httpServer.createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    response.setHeader('Content-Type', 'application/json');
    const success = (data, status = 200) => { response.statusCode = status; response.end(JSON.stringify({ data, meta: { requestId: 'fixture' } })); };
    if (request.url === '/api/auth/refresh-token') { refreshes++; authenticated = true; success({}); return; }
    if (request.url === '/api/users/avatar') uploads.push({ body, headers: request.headers });
    if (request.url === '/api/activity') activities.push(body);
    if (!authenticated) { response.statusCode = 401; response.end(JSON.stringify({ error: { code: 'INVALID_SESSION', message: 'Expired', details: [] }, requestId: 'fixture' })); return; }
    commits++;
    success(request.url === '/api/activity' ? { event_id: event.session_id, activity_id: '42' } : { avatar: 'controlled-fixture' }, 201);
  }).listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`, previous = http.defaults.baseURL;
  http.defaults.baseURL = base + '/api'; t.after(() => { http.defaults.baseURL = previous; });
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => nativeFetch(new URL(String(url), base), options));
  const form = new FormData(); form.set('title', 'Synthetic'); form.set('avatar', new Blob(['synthetic-file-bytes'], { type: 'image/png' }), 'fixture.png');
  const result = await http.post('/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': 'intent-fixture' } });
  assert.equal(result.data.avatar, 'controlled-fixture'); assert.equal(uploads.length, 2); assert.equal(refreshes, 1); assert.equal(commits, 1);
  for (const upload of uploads) {
    assert.match(upload.headers['content-type'], /^multipart\/form-data; boundary=/); assert.equal(upload.headers['idempotency-key'], 'intent-fixture');
    assert.ok(upload.body.includes('synthetic-file-bytes') && upload.body.includes('Synthetic') && upload.body.includes('fixture.png'));
  }
  authenticated = false;
  assert.equal(await new ActivityDelivery().send(event), true);
  assert.equal(activities.length, 2); assert.equal(activities[0], activities[1]); assert.equal(JSON.parse(activities[0]).session_id, event.session_id);
  assert.equal(refreshes, 2); assert.equal(commits, 2);
});
test('account change during upload hashing rejects the original intent instead of uploading as the new user', async () => {
  let release; const gate = new Promise((resolve) => { release = resolve; });
  const form = { *entries() { yield ['audioFile', { arrayBuffer: async () => { await gate; return new Uint8Array([1, 2]).buffer; } }]; } };
  const pending = uploadKey(form, 'user-song').catch((error) => error);
  beginAuthChange('user'); setPrincipal('user', toUser({ user_id: 2 })); release();
  assert.equal((await pending).code, 'AUTH_CONTEXT_CHANGED');
});
test('pending listening retries and pagehide cannot send the old event under another account', async () => {
  let reject, calls = 0, beacons = 0;
  const delivery = new ActivityDelivery(() => { calls++; return new Promise((resolve, fail) => { reject = fail; }); }, async () => {});
  const sending = delivery.send(event);
  beginAuthChange('user'); setPrincipal('user', toUser({ user_id: 2 })); reject(new TypeError('old request aborted'));
  assert.equal(await sending, false); delivery.pagehide(() => { beacons++; return true; });
  assert.equal(calls, 1); assert.equal(beacons, 0);
});
test('stale profile response cannot replace or expire the newly authenticated principal', () => {
  const epoch = getAuth('user').epoch;
  beginAuthChange('user'); setPrincipal('user', toUser({ user_id: 2 }));
  setPrincipal('user', toUser({ user_id: 1 }), epoch);
  assert.equal(getAuth('user').principal.userId, 2);
});
test('explicit account change clears legacy player data even before profile bootstrap finishes', (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map([['player_state_v2', 'old-private'], ['player_state_v3', 'old-private'], ['unrelated', 'keep']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { removeItem: (key) => storage.delete(key) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; });
  assert.equal(getAuth('user').status, 'unknown'); beginAuthChange('user');
  assert.equal(storage.has('player_state_v2'), false); assert.equal(storage.has('player_state_v3'), false); assert.equal(storage.get('unrelated'), 'keep');
});
