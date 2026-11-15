const test = require('node:test');
const assert = require('node:assert/strict');
const { RefreshToken } = require('../../src/models');
const sessions = require('../../src/services/session.service');
const auth = require('../../src/services/auth.service');

test('legacy JWT, malformed, oversized and absent refresh credentials are rejected before storage', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => null);
  for (const raw of [undefined, '', 'legacy.jwt.signature', 'a'.repeat(1000), {}, 'a'.repeat(42)]) {
    await assert.rejects(auth.refreshToken(raw), { statusCode: 401 });
    await assert.rejects(auth.refreshAdminToken(raw), { statusCode: 401 });
  }
  assert.equal(find.mock.callCount(), 0);
});
test('opaque lookup uses only SHA-256 digest and the endpoint scope', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => null);
  const raw = 'x'.repeat(43);
  await assert.rejects(auth.refreshToken(raw), { statusCode: 401 });
  await assert.rejects(auth.refreshAdminToken(raw), { statusCode: 401 });
  assert.deepEqual(find.mock.calls.map((c) => c.arguments[0].where), [
    { token: sessions.digest(raw), scope: 'user' }, { token: sessions.digest(raw), scope: 'admin' },
  ]);
});
test('access tokens without a session identity fail closed before storage', async (t) => {
  const find = t.mock.method(RefreshToken, 'findOne', async () => null);
  for (const sessionId of [undefined, '', 'invalid']) await assert.rejects(sessions.validateAccessSession({ sessionId }), { statusCode: 401 });
  assert.equal(find.mock.callCount(), 0);
});
