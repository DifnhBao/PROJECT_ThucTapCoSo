const fetch = require("../helpers/browser-fetch.cjs");
require("../helpers/mock-session-boundary.cjs");
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } = require('sequelize');
const { createApp } = require('../../src/app');
const songs = require('../../src/services/song.service');
const auth = require('../../src/services/auth.service');
const { User } = require('../../src/models');
let server, base;
const headers = (role = 'user') => ({ 'Content-Type': 'application/json', Cookie: `${role === 'user' ? 'accessToken' : 'accessToken_admin'}=${jwt.sign({ userId: 1, role, scope: role === 'user' ? 'user' : 'admin' }, process.env.JWT_SECRET)}` });
const request = (url, options = {}) => fetch(base + url, { ...options, signal: AbortSignal.timeout(5000) });
function assertError(body, code) {
  assert.deepEqual(Object.keys(body).sort(), ['error', 'requestId']);
  assert.deepEqual(Object.keys(body.error).sort(), ['code', 'details', 'message']);
  assert.equal(body.error.code, code);
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
}
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test('invalid URL inputs are rejected before a service can query MySQL', async (t) => {
  const query = t.mock.method(songs, 'getSongs', () => { throw new Error('service must not run'); });
  for (const url of ['/songs?page=0', '/songs?page=1e3', '/songs?limit=101', '/songs?limit=true', '/songs?limit=1&limit=2', '/songs/search?q[]=x', '/songs/search?q[x]=y', '/songs/search?q=' + 'x'.repeat(201), '/songs/-1', '/songs/1abc', '/songs/9007199254740993', '/artists/0']) {
    const response = await request(url);
    assert.equal(response.status, 400, url);
    assertError(await response.json(), 'VALIDATION_ERROR');
  }
  assert.equal(query.mock.callCount(), 0);
});

test('strict mutation schemas reject wrong types, rating ranges, enums and injected identity/role', async (t) => {
  const update = t.mock.method(User, 'findByPk', () => { throw new Error('must not read DB'); });
  const cases = [
    ['/ratings/rate', { songId: 1, score: 6 }], ['/ratings/rate', { songId: 1, score: '5' }], ['/ratings/rate', { songId: 1, score: null }],
    ['/playlists', { name: 'ok', user_id: 2 }], ['/playlists', { name: '' }],
    ['/users/change-password', { oldPassword: 'old', newPassword: 'Valid-Password1', role: 'admin' }],
    ['/activity', { song_id: 1, session_id: 'x', source: 'invalid', exit_reason: 'ended', song_duration: 100, total_listened_time: 1 }],
    ['/auth/register', { username: 'safe', password: 'Secret-Password1', email: 'invalid', role: 'admin' }],
  ];
  for (const [url, body] of cases) {
    const response = await request(url, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
    assert.equal(response.status, 400, url);
    const result = await response.json();
    assertError(result, 'VALIDATION_ERROR');
    assert.equal(JSON.stringify(result).includes('Secret-Password1'), false);
  }
  assert.equal(update.mock.callCount(), 0);
  const response = await request('/users/me', { method: 'PUT', headers: headers(), body: JSON.stringify({ role: 'super_admin' }) });
  assert.equal(response.status, 400);
});

test('JSON syntax, unknown routes, authentication and request correlation share the error contract', async (t) => {
  const malformed = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'untrusted-client-id' }, body: '{"password":"never-log-this"' });
  assert.equal(malformed.status, 400);
  const body = await malformed.json();
  assertError(body, 'INVALID_JSON');
  assert.equal(body.requestId, malformed.headers.get('X-Request-Id'));
  assert.equal(JSON.stringify(body).includes('never-log-this'), false);
  const missing = await request('/missing');
  assert.equal(missing.status, 404);
  assertError(await missing.json(), 'ROUTE_NOT_FOUND');
  const invalidUrl = await request('/songs/%E0%A4%A');
  assert.equal(invalidUrl.status, 400);
  assertError(await invalidUrl.json(), 'INVALID_URL');
  const anonymous = await request('/users/me');
  assert.equal(anonymous.status, 401);
  assertError(await anonymous.json(), 'AUTH_REQUIRED');
  const denied = await request('/users', { headers: headers() });
  assert.equal(denied.status, 403);
  assertError(await denied.json(), 'FORBIDDEN');
  const unsupported = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'unsupported' });
  assert.equal(unsupported.status, 415);
  assertError(await unsupported.json(), 'UNSUPPORTED_MEDIA_TYPE');
  const oversized = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'x'.repeat(110000) }) });
  assert.equal(oversized.status, 413);
  assertError(await oversized.json(), 'PAYLOAD_TOO_LARGE');
  const origin = await request('/songs', { headers: { Origin: 'https://untrusted.example.test' } });
  assert.equal(origin.status, 403);
  assertError(await origin.json(), 'ORIGIN_FORBIDDEN');
  const form = new FormData();
  form.set('title', 'Unsupported file');
  form.set('audioFile', new Blob(['synthetic'], { type: 'text/plain' }), 'file.txt');
  t.mock.method(User, 'findByPk', async () => ({ role: 'admin' }));
  const invalidFile = await request('/songs', { method: 'POST', headers: { Cookie: headers('admin').Cookie, 'Idempotency-Key': 'fixture-file-key' }, body: form });
  assert.equal(invalidFile.status, 415);
  assertError(await invalidFile.json(), 'UNSUPPORTED_MEDIA_TYPE');
});

test('unexpected errors, SQL and sensitive values never reach response or request logs', async (t) => {
  const logs = [];
  t.mock.method(console, 'error', (line) => logs.push(line));
  t.mock.method(songs, 'getSongs', () => { throw new Error('SELECT password FROM users; secret-db-password stack trace'); });
  const response = await request('/songs');
  assert.equal(response.status, 500);
  const body = await response.json();
  assertError(body, 'INTERNAL_ERROR');
  assert.equal(/SELECT|password|stack trace/.test(JSON.stringify(body) + logs.join('')), false);
  assert.equal(JSON.parse(logs[0]).requestId, body.requestId);
});

test('ORM duplicate, foreign-key and validation failures map by class, not message text', async (t) => {
  const errors = [[new UniqueConstraintError({ message: 'private SQL/email' }), 409, 'DUPLICATE_RESOURCE'], [new ForeignKeyConstraintError({ message: 'private SQL' }), 409, 'REFERENCE_CONFLICT'], [new ValidationError('private input'), 422, 'INVALID_RESOURCE']];
  let active;
  t.mock.method(auth, 'registerUser', () => { throw active; });
  for (const [error, status, code] of errors) {
    active = error;
    const response = await request('/auth/register', { method: 'POST', headers: headers(), body: JSON.stringify({ username: 'synthetic', email: 'synthetic@example.test', password: 'Synthetic-Test1!' }) });
    assert.equal(response.status, status);
    const body = await response.json();
    assertError(body, code);
    assert.equal(JSON.stringify(body).includes('private'), false);
  }
});

test('successful payloads use one outer envelope and parsed paging reaches the service', async (t) => {
  const read = t.mock.method(songs, 'getSongs', async (paging) => ({ ...paging, total: 0, songs: [] }));
  const response = await request('/songs?page=2&limit=100');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['data', 'meta']);
  assert.deepEqual(body.data, { page: 2, limit: 100, total: 0, songs: [] });
  assert.equal(body.meta.requestId, response.headers.get('X-Request-Id'));
  assert.deepEqual(read.mock.calls[0].arguments[0], { page: 2, limit: 100 });
});

test('late errors delegate when headers were already sent; 204 emits no JSON body', async () => {
  const original = new Error('late');
  let delegated;
  require('../../src/midlewares/error.midleware')(original, {}, { headersSent: true }, (error) => { delegated = error; });
  assert.equal(delegated, original);
  let jsonCalled = false, ended = false;
  const response = { statusCode: 204, setHeader() {}, json() { jsonCalled = true; }, end() { ended = true; } };
  require('../../src/midlewares/api-contract').apiContract({}, response, () => {});
  response.json({ ignored: true });
  assert.equal(ended, true);
  assert.equal(jsonCalled, false);
});
