const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { getSecurityConfig, cookieOptions } = require('../../src/config/security');
const { AppError } = require('../../src/utils/app-error');
const sessions = require('../../src/services/session.service');
const auth = require('../../src/services/auth.service');
const hybrid = require('../../src/services/recommendation/hybridSimilarity.service');
const origin = 'http://localhost:3000';
const cookie = (userId = 1, role = 'user') => `${role === 'user' ? 'accessToken' : 'accessToken_admin'}=${jwt.sign({ userId, role, scope: role === 'user' ? 'user' : 'admin', sessionId: '00000000-0000-4000-8000-000000000001' }, process.env.JWT_SECRET)}`;
async function setup(t, env = {}, clock) {
  const config = getSecurityConfig({ NODE_ENV: 'test', ...env });
  const app = createApp({ securityConfig: config, securityClock: clock });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { app, base: `http://127.0.0.1:${server.address().port}/api` };
}
const post = (headers = {}, body = '{}') => ({ method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body });
const credentials = JSON.stringify({ username: 'fixture', password: 'fixture' });

test('CSRF rejects absent/null/hostile Origin and cross-site mutation before any service runs', { timeout: 15000 }, async (t) => {
  const { base } = await setup(t);
  const logout = t.mock.method(auth, 'logoutUser', async () => {});
  for (const headers of [{}, { Origin: 'null' }, { Origin: 'https://evil.example' }, { Origin: origin, 'Sec-Fetch-Site': 'cross-site' }]) {
    const res = await fetch(base + '/auth/logout', { method: 'POST', headers: { Cookie: 'refreshToken=synthetic', 'Content-Type': 'application/json', ...headers }, body: '{}' });
    assert.equal(res.status, 403);
    assert.ok((await res.json()).error.code.startsWith('ORIGIN') || headers['Sec-Fetch-Site']);
  }
  assert.equal(logout.mock.callCount(), 0);
  assert.equal((await fetch(base + '/auth/logout', post({ 'Sec-Fetch-Site': 'same-origin' }))).status, 200);
  assert.equal(logout.mock.callCount(), 1);
});

test('login IP quota cannot be bypassed by spoofed forwarded headers; expiry permits retry', { timeout: 15000 }, async (t) => {
  let time = 0;
  const { base } = await setup(t, { RATE_LOGIN_IP_MAX: '2', RATE_LOGIN_IP_WINDOW_MS: '1000' }, () => time);
  const login = t.mock.method(auth, 'loginUser', async () => { throw new AppError('Username hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS'); });
  for (let i = 0; i < 2; i++) assert.equal((await fetch(base + '/auth/login', post({ 'X-Forwarded-For': `198.51.100.${i}`, 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'https' }, credentials))).status, 401);
  const res = await fetch(base + '/AuTh/LoGiN/', post({ 'X-Forwarded-For': '203.0.113.1' }, credentials));
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '1');
  assert.equal((await res.json()).error.code, 'RATE_LIMITED');
  assert.equal(login.mock.callCount(), 2);
  time = 1001;
  login.mock.mockImplementation(async () => ({ user: { user_id: 1 }, tokens: { accessToken: 'fixture', refreshToken: 'fixture', accessExpiresIn: 1000, refreshExpiresAt: new Date(Date.now() + 10000) } }));
  assert.equal((await fetch(base + '/auth/login', post({}, credentials))).status, 200);
});

test('account quota spans trusted client IPs and user/admin login endpoints without logging identifiers', { timeout: 15000 }, async (t) => {
  const { base } = await setup(t, { TRUSTED_PROXY_CIDRS: '127.0.0.1/32', RATE_LOGIN_ACCOUNT_MAX: '2' });
  const log = t.mock.method(console, 'warn', () => {});
  t.mock.method(auth, 'loginUser', async () => { throw new AppError('Username hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS'); });
  t.mock.method(auth, 'loginAdmin', async () => { throw new AppError('Username hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS'); });
  for (let i = 0; i < 2; i++) assert.equal((await fetch(base + '/auth/login', post({ 'X-Forwarded-For': `198.51.100.${i}` }, credentials))).status, 401);
  const res = await fetch(base + '/auth/admin/login', post({ 'X-Forwarded-For': '203.0.113.2' }, JSON.stringify({ username: 'FIXTURE', password: 'fixture' })));
  assert.equal(res.status, 429);
  const logs = JSON.stringify(log.mock.calls.map((call) => call.arguments));
  assert.equal(/fixture|198\.51|203\.0|password|refreshToken/i.test(logs), false);
});

test('per-user upload quota is checked before disk writes; activity has per-user quota and small body cap', { timeout: 15000 }, async (t) => {
  const { base } = await setup(t, { RATE_UPLOAD_MAX: '1', RATE_ACTIVITY_MAX: '1', ACTIVITY_BODY_MAX_BYTES: '128' });
  t.mock.method(sessions, 'validateAccessSession', async () => {});
  assert.equal((await fetch(base + '/songs/upload', post({ Cookie: cookie() }))).status, 400);
  const directory = require('../../src/services/upload-files').root;
  const before = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
  const form = new FormData(); form.append('audioFile', new Blob(['fixture'], { type: 'audio/mpeg' }), 'fixture.mp3');
  assert.equal((await fetch(base + '/songs/upload', { method: 'POST', headers: { Origin: origin, Cookie: cookie() }, body: form })).status, 429);
  assert.deepEqual(fs.existsSync(directory) ? fs.readdirSync(directory) : [], before);
  assert.equal((await fetch(base + '/activity', post({ Cookie: cookie() }))).status, 400);
  assert.equal((await fetch(base + '/activity', post({ Cookie: cookie() }))).status, 429);
  assert.equal((await fetch(base + '/activity', post({ Cookie: cookie(2) }))).status, 400);
  assert.equal((await fetch(base + '/activity', post({ Cookie: cookie(2) }, JSON.stringify({ value: 'x'.repeat(200) })))).status, 413);
});

test('T14: HTTP rebuild is validation/auth protected and never runs compute', async (t) => {
  const { base } = await setup(t);
  t.mock.method(sessions, 'validateAccessSession', async () => {});
  const run = t.mock.method(hybrid, 'rebuildAllSongSimilarities', async () => { throw new Error('must not run'); });
  assert.equal((await fetch(base + '/recommendations/rebuild-similarity', post())).status, 401);
  assert.equal((await fetch(base + '/recommendations/rebuild-similarity', post({ Cookie: cookie(3, 'admin') }, '{"limit":0}'))).status, 400);
  for (const role of ['admin', 'super_admin']) {
    const response = await fetch(base + '/recommendations/rebuild-similarity', post({ Cookie: cookie(3, role) }));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, 'OFFLINE_REBUILD_REQUIRED');
  }
  assert.equal(run.mock.callCount(), 0);
});

test('bounded limiter store fails closed, reclaims expired keys and remains isolated between app instances', { timeout: 15000 }, async (t) => {
  let time = 0;
  const { base } = await setup(t, { RATE_STORE_MAX_ENTRIES: '1', RATE_API_WINDOW_MS: '1000' }, () => time);
  assert.equal((await fetch(base + '/auth/login', post({}, credentials))).status, 429); // API key fills store before login-IP key.
  const { base: fresh } = await setup(t);
  assert.equal((await fetch(fresh + '/missing')).status, 404);
  time = 1001;
  assert.equal((await fetch(base + '/missing')).status, 404);
});

test('CORS preflight and API headers are explicit; cookie production policy is HTTPS + Lax', { timeout: 15000 }, async (t) => {
  const { base } = await setup(t);
  const res = await fetch(base + '/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), origin);
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  assert.equal(cookieOptions({ NODE_ENV: 'production' }).secure, true);
  assert.equal(cookieOptions({ NODE_ENV: 'production' }).sameSite, 'lax');
  for (const TRUSTED_PROXY_CIDRS of ['true', '1', 'loopback', '0.0.0.0/0', '::/0', '127.0.0.1/33']) assert.throws(() => getSecurityConfig({ TRUSTED_PROXY_CIDRS }));
  assert.throws(() => getSecurityConfig({ NODE_ENV: 'production', WEB_ORIGINS: 'http://example.test' }));
  assert.throws(() => getSecurityConfig({ RATE_API_MAX: '0' }));
});


test('registration, refresh and public recommendations each enforce their configured quota', { timeout: 15000 }, async (t) => {
  const { base } = await setup(t, { RATE_REGISTER_MAX: '1', RATE_REFRESH_MAX: '1', RATE_RECOMMENDATION_MAX: '1' });
  t.mock.method(auth, 'registerUser', async () => ({ user: { user_id: 1 } }));
  t.mock.method(auth, 'refreshToken', async () => ({ accessToken: 'fixture', refreshToken: 'fixture', accessExpiresIn: 1000, refreshExpiresAt: new Date(Date.now() + 10000) }));
  const rec = require('../../src/services/recommendation/recommendation.service');
  const call = t.mock.method(rec, 'getSimilarSongs', async () => []);
  const registration = JSON.stringify({ username: 'fixture', password: 'FixturePassword!42', email: 'fixture@example.test' });
  assert.equal((await fetch(base + '/auth/register', post({}, registration))).status, 201);
  assert.equal((await fetch(base + '/auth/register', post({}, registration))).status, 429);
  assert.equal((await fetch(base + '/auth/refresh-token', post())).status, 200);
  assert.equal((await fetch(base + '/auth/refresh-token', post())).status, 429);
  assert.equal((await fetch(base + '/recommendations/songs/1/similar')).status, 200);
  assert.equal((await fetch(base + '/recommendations/songs/2/similar')).status, 429);
  assert.equal(call.mock.callCount(), 1);
});


