import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from '../../app/lib/http.ts';
import { refreshSession } from '../../app/lib/refresh-session.ts';
import { apiFetch } from '../../app/lib/api-transport.ts';
import { userFetch } from '../../app/utils/refreshToken.ts';
import { beginAuthChange, discoverAuth, getAuth, setPrincipal, toUser } from '../../app/lib/auth-state.ts';
import { loginApi } from '../../app/features/auth/api.ts';
const success = (value = {}) => new Response(JSON.stringify({ data: value, meta: { requestId: 'fixture' } }), { headers: { 'Content-Type': 'application/json' } });
const failure = () => new Response(JSON.stringify({ error: { code: 'INVALID_SESSION', message: 'Expired', details: [] }, requestId: 'fixture' }), { status: 401 });
const gate = () => { let release; const wait = new Promise((resolve) => { release = resolve; }); return { wait, release }; };
const until = async (condition) => { for (let i = 0; i < 1000; i++) { if (condition()) return; await new Promise((r) => setImmediate(r)); } assert.fail('Expected event was not observed'); };
beforeEach(() => { discoverAuth('user'); discoverAuth('admin'); });

test('12 user and8 admin refresh callers share one flight per scope', async (t) => {
  const calls = [], g = gate();
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push([url, options]); await g.wait; return success(); });
  const requests = [...Array.from({ length: 12 }, () => refreshSession('user')), ...Array.from({ length: 8 }, () => refreshSession('admin'))];
  assert.equal(calls.length, 2); g.release(); await Promise.all(requests);
  assert.deepEqual(calls.map(([url]) => url).sort(), ['/api/auth/admin/refresh-token', '/api/auth/refresh-token']);
  assert.ok(calls.every(([, options]) => options.credentials === 'include' && options.body === '{}'));
});
test('failed refresh expires scope, rejects waiters and latches until a new authentication attempt', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return calls === 1 ? failure() : success(); });
  const outcomes = await Promise.allSettled([refreshSession('user'), refreshSession('user')]);
  assert.equal(calls, 1); assert.ok(outcomes.every((r) => r.status === 'rejected')); assert.equal(getAuth('user').status, 'expired');
  await assert.rejects(userFetch('/favorites/me'), { code: 'SESSION_EXPIRED' }); assert.equal(calls, 1);
  beginAuthChange('user'); setPrincipal('user', toUser({ user_id: 2 })); await refreshSession('user'); assert.equal(calls, 2);
});
test('persistent401 replays once then expires UI state; refresh endpoint never recurses', async (t) => {
  let requests = 0, refreshes = 0;
  t.mock.method(globalThis, 'fetch', async (url) => { if (String(url).includes('refresh-token')) { refreshes++; return success(); } requests++; return failure(); });
  assert.equal((await userFetch('/favorites/me')).status, 401); assert.equal(requests, 2); assert.equal(refreshes, 1);
  await assert.rejects(userFetch('/favorites/me'), { code: 'SESSION_EXPIRED' }); assert.equal(requests, 2);
  assert.equal((await apiFetch('/auth/login', { method: 'POST' }, 'user')).status, 401); assert.equal(refreshes, 1);
});
test('Axios and compatibility fetch use the same refresh and preserve business DTOs', async (t) => {
  let refreshes = 0, requests = 0, ready = false; const g = gate();
  t.mock.method(globalThis, 'fetch', async (url) => { if (String(url).includes('refresh-token')) { refreshes++; await g.wait; ready = true; return success(); } requests++; return ready ? success({ result: 'ok' }) : failure(); });
  const a = http.get('/fixture'); const b = userFetch('/fixture'); await until(() => refreshes === 1); g.release();
  const [left, right] = await Promise.all([a, b]); assert.equal(left.data.result, 'ok'); assert.equal(right.status, 200); assert.equal(refreshes, 1); assert.equal(requests, 4);
});
test('late401 from a request started before completed refresh does not trigger a second refresh', async (t) => {
  let refreshes = 0, lateCalls = 0, ready = false; const g = gate();
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (String(url).includes('refresh-token')) { refreshes++; ready = true; return success(); }
    if (String(url).includes('/late') && ++lateCalls === 1) { await g.wait; return failure(); }
    return ready ? success() : failure();
  });
  const late = userFetch('/late'); assert.equal((await userFetch('/early')).status, 200); g.release(); assert.equal((await late).status, 200); assert.equal(refreshes, 1);
});
test('account switch during refresh discards old response, cannot replay or expire new account', async (t) => {
  setPrincipal('user', toUser({ user_id: 1 })); const g = gate(); let refreshes = 0, requests = 0;
  t.mock.method(globalThis, 'fetch', async (url) => { if (String(url).includes('refresh-token')) { refreshes++; await g.wait; return success(); } requests++; return failure(); });
  const old = userFetch('/favorites/me').catch((e) => e); await until(() => refreshes === 1);
  beginAuthChange('user'); setPrincipal('user', toUser({ user_id: 2 })); g.release(); const result = await old;
  assert.equal(result.code, 'AUTH_CONTEXT_CHANGED'); assert.equal(getAuth('user').principal.userId, 2); assert.equal(getAuth('user').status, 'authenticated'); assert.equal(requests, 1);
});
test('401 replay preserves multipart identity, event UUID, method and Idempotency-Key; network errors never auto-replay POST', async (t) => {
  const calls = []; let ready = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => { if (String(url).includes('refresh-token')) { ready = true; return success(); } calls.push(options); return ready ? success() : failure(); });
  const form = new FormData(); form.set('audioFile', new Blob(['fixture']), 'fixture.wav');
  await userFetch('/songs', { method: 'POST', body: form, headers: { 'Idempotency-Key': 'intent-123' } });
  assert.equal(calls.length, 2); assert.ok(calls.every((o) => o.method === 'POST' && o.body === form && o.headers.get('Idempotency-Key') === 'intent-123'));
  ready = false; calls.length = 0; const body = JSON.stringify({ event_version: 1, session_id: 'uuid-fixed' });
  await userFetch('/activity', { method: 'POST', body }); assert.ok(calls.every((o) => o.body === body));
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(userFetch('/favorites/1/like', { method: 'POST' })); assert.equal(mock.mock.callCount(), 1);
});
test('new login supersedes old login without adopting its identity or returning its response', async (t) => {
  const g = gate(); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; if (calls === 1) await g.wait; return success({ data: { user: { user_id: calls } } }); });
  const first = loginApi('first', 'fixture').catch((e) => e); await until(() => calls === 1);
  const second = loginApi('second', 'fixture'); g.release();
  assert.equal((await first).code, 'AUTH_CONTEXT_CHANGED'); await second; assert.equal(getAuth('user').principal.userId, 2); assert.equal(calls, 2);
});
test('guest public reads work while private APIs remain blocked', async (t) => {
  setPrincipal('user', null); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return success(); });
  assert.equal((await http.get('/songs')).status, 200);
  await assert.rejects(http.get('/favorites/me'), { code: 'SESSION_EXPIRED' }); assert.equal(calls, 1);
});
test('Web Locks coordinates refresh tabs separately by scope', async (t) => {
  const names = [], descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (name, run) => { names.push(name); return run(); } } } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator; });
  t.mock.method(globalThis, 'fetch', async () => success()); await Promise.all([refreshSession('user'), refreshSession('admin')]);
  assert.deepEqual(names.sort(), ['session-refresh-admin', 'session-refresh-user']);
});
