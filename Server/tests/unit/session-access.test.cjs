const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { RefreshToken } = require('../../src/models');
const { protect, protectAdmin, optionalAuth } = require('../../src/midlewares/auth.midleware');
const claims = { userId: 7, role: 'user', scope: 'user', sessionId: '00000000-0000-4000-8000-000000000007' };
const invoke = (middleware, data) => {
  const req = { headers: {}, cookies: data ? { accessToken: jwt.sign(data, process.env.JWT_SECRET) } : {} };
  return new Promise((resolve) => middleware(req, {}, (error) => resolve({ req, error })));
};

test('middleware rejects signed legacy access tokens before database access', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => null);
  const { sessionId, ...legacy } = claims;
  assert.equal((await invoke(protect, legacy)).error.statusCode, 401);
  assert.equal(find.mock.callCount(), 0);
});
test('access validation binds family, signed owner, scope and current database role', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => ({}));
  const result = await invoke(protect, claims);
  assert.equal(result.error, undefined);
  const query = find.mock.calls[0].arguments[0];
  assert.equal(query.where.family_id, claims.sessionId);
  assert.equal(query.where.user_id, 7);
  assert.equal(query.where.scope, 'user');
  assert.equal(query.where.revoked_at, null);
  assert.equal(query.where.consumed_at, null);
  assert.deepEqual(query.include[0].where, { role: 'user' });
  assert.ok(Object.isFrozen(result.req.auth));
});
test('revoked or expired database session rejects both required and optional auth', async (t) => {
  t.mock.method(RefreshToken, 'findOne', async () => null);
  assert.equal((await invoke(protect, claims)).error.statusCode, 401);
  assert.equal((await invoke(optionalAuth, claims)).error.statusCode, 401);
  assert.equal((await invoke(optionalAuth)).error, undefined);
});
test('database failure propagates, with no success or JWT-only fallback', async (t) => {
  const failure = new Error('synthetic storage unavailable');
  t.mock.method(RefreshToken, 'findOne', async () => { throw failure; });
  assert.equal((await invoke(protect, claims)).error, failure);
  assert.equal((await invoke(optionalAuth, claims)).error, failure);
});
test('wrong-scope access is forbidden before session storage lookup', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => ({}));
  assert.equal((await invoke(protectAdmin, claims)).error.statusCode, 403);
  assert.equal(find.mock.callCount(), 0);
});
