const fetch = require("../helpers/browser-fetch.cjs");
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../../src/models');
const auth = require('../../src/services/auth.service');
const sessions = require('../../src/services/session.service');
const users = require('../../src/services/user.service');

module.exports = async function sessionLifecycle(t, baseUrl) {
  const password = process.env.TEST_SEED_PASSWORD;
  const login = (username = 'demo_userA') => auth.loginUser({ username, password });
  const principal = (access) => jwt.verify(access, process.env.JWT_SECRET);
  const denied = (fn) => assert.rejects(fn, { statusCode: 401 });
  const active = (family_id) => RefreshToken.count({ where: { family_id, consumed_at: null, revoked_at: null } });
  const profile = (access) => fetch(baseUrl + '/users/me', { headers: { Cookie: `accessToken=${access}` } });

  await t.test('AT07: username100, parallel same-second login, minimal access claims and digest-only persistence', async () => {
    await User.update({ username: 'u'.repeat(100) }, { where: { user_id: 2 } });
    const [a, b] = await Promise.all([login('u'.repeat(100)), login('u'.repeat(100))]);
    assert.ok(a.tokens.refreshToken !== b.tokens.refreshToken);
    for (const { tokens } of [a, b]) {
      assert.equal(tokens.refreshToken.length, 43);
      const claims = principal(tokens.accessToken);
      assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'role', 'scope', 'sessionId', 'userId'].sort());
      const saved = await RefreshToken.findOne({ where: { token: sessions.digest(tokens.refreshToken) } });
      assert.ok(saved && saved.token !== tokens.refreshToken);
      assert.equal(saved.token.length, 64);
      await sessions.validateAccessSession(claims);
    }
  });

  await t.test('AT08: concurrent refresh and lost-response retry produce exactly one active successor', async () => {
    const { tokens } = await login();
    const results = await Promise.all(Array.from({ length: 12 }, () => auth.refreshToken(tokens.refreshToken)));
    assert.ok(results.every((item) => item.refreshToken === results[0].refreshToken));
    assert.ok(results[0].refreshToken !== tokens.refreshToken);
    const family = principal(tokens.accessToken).sessionId;
    assert.equal(await active(family), 1);
    assert.equal(await RefreshToken.count({ where: { family_id: family } }), 2);
    const retry = await auth.refreshToken(tokens.refreshToken);
    assert.ok(retry.refreshToken === results[0].refreshToken);
    assert.equal(await active(family), 1);
    assert.equal((await profile(tokens.accessToken)).status, 200);
    // A second rotation has advanced past the original result: bounded conflict,
    // without revoking the legitimate family or issuing another branch.
    const advanced = await auth.refreshToken(retry.refreshToken);
    await assert.rejects(auth.refreshToken(tokens.refreshToken), { statusCode: 409, code: 'REFRESH_CONFLICT' });
    await sessions.validateAccessSession(principal(advanced.accessToken));
  });

  await t.test('expired tokens, cross-scope tokens, missing-session legacy access and revoked access fail closed', async () => {
    const { tokens } = await login();
    await denied(auth.refreshAdminToken(tokens.refreshToken));
    const admin = await auth.loginAdmin({ username: 'demo_admin', password });
    await denied(auth.refreshToken(admin.tokens.refreshToken));
    await auth.logoutAdmin(tokens.refreshToken); // Wrong-scope logout must not affect user.
    await sessions.validateAccessSession(principal(tokens.accessToken));
    const legacy = jwt.sign({ userId: 1, role: 'user', scope: 'user' }, process.env.JWT_SECRET);
    assert.equal((await profile(legacy)).status, 401);
    await RefreshToken.update({ expires_at: new Date(Date.now() - 1000) }, { where: { token: sessions.digest(tokens.refreshToken) } });
    await denied(auth.refreshToken(tokens.refreshToken));
    assert.equal((await profile(tokens.accessToken)).status, 401);
    await auth.logoutAdmin(admin.tokens.refreshToken);
    await denied(sessions.validateAccessSession(principal(admin.tokens.accessToken)));
  });

  await t.test('logout through an old family token revokes rotated access; missing cookies still clear both cookies', async () => {
    const { tokens } = await login();
    const rotated = await auth.refreshToken(tokens.refreshToken);
    await auth.logoutUser(tokens.refreshToken);
    assert.equal((await profile(tokens.accessToken)).status, 401);
    assert.equal((await profile(rotated.accessToken)).status, 401);
    await denied(auth.refreshToken(rotated.refreshToken));
    for (const endpoint of ['/auth/logout', '/auth/admin/logout']) {
      const res = await fetch(baseUrl + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(res.status, 200);
      assert.equal(res.headers.getSetCookie().length, 2);
      assert.ok(res.headers.getSetCookie().every((value) => value.includes('Path=/') && value.includes('HttpOnly') && !value.includes('Secure') && value.includes('SameSite=Lax')));
    }
  });

  await t.test('reuse beyond ten seconds commits family revocation and preserves another login', async () => {
    const a = await login(), b = await login();
    const child = await auth.refreshToken(a.tokens.refreshToken);
    await RefreshToken.update({ consumed_at: new Date(Date.now() - 11000) }, { where: { token: sessions.digest(a.tokens.refreshToken) } });
    await denied(auth.refreshToken(a.tokens.refreshToken));
    await denied(auth.refreshToken(child.refreshToken));
    assert.equal(await active(principal(a.tokens.accessToken).sessionId), 0);
    assert.equal((await profile(child.accessToken)).status, 401);
    assert.equal((await profile(b.tokens.accessToken)).status, 200);
  });

  await t.test('rotation failure rolls back consumption and can be retried', async (context) => {
    const { tokens } = await login();
    const create = context.mock.method(RefreshToken, 'create', async () => { throw new Error('simulated persistence failure'); });
    await assert.rejects(auth.refreshToken(tokens.refreshToken), /simulated persistence failure/);
    create.mock.restore();
    const row = await RefreshToken.findOne({ where: { token: sessions.digest(tokens.refreshToken) } });
    assert.equal(row.consumed_at, null);
    assert.equal(row.replacement_digest, null);
    assert.equal(await active(row.family_id), 1);
    await auth.refreshToken(tokens.refreshToken);
  });

  await t.test('reset/change password and promote/demote revoke all target sessions immediately', async () => {
    const a = await login(), b = await login();
    await users.resetUserPassword(1, password, { userId: 3, role: 'admin', scope: 'admin' });
    for (const { tokens } of [a, b]) {
      await denied(auth.refreshToken(tokens.refreshToken));
      assert.equal((await profile(tokens.accessToken)).status, 401);
    }
    const cold = await login('demo_cold_start');
    const nextPassword = 'ChangedFixturePassword!42';
    await users.changeUserPassword(5, password, nextPassword);
    await denied(auth.refreshToken(cold.tokens.refreshToken));
    assert.equal((await profile(cold.tokens.accessToken)).status, 401);
    await assert.rejects(login('demo_cold_start'), { statusCode: 401 });
    await auth.loginUser({ username: 'demo_cold_start', password: nextPassword });
    const actor = { userId: 4, role: 'super_admin', scope: 'admin' };
    const target = await login('u'.repeat(100));
    await users.promoteUserToAdmin(2, actor);
    await denied(auth.refreshToken(target.tokens.refreshToken));
    assert.equal((await profile(target.tokens.accessToken)).status, 401);
    const admin = await auth.loginAdmin({ username: 'u'.repeat(100), password });
    await users.demoteAdminToUser(2, actor);
    await denied(auth.refreshAdminToken(admin.tokens.refreshToken));
    await denied(sessions.validateAccessSession(principal(admin.tokens.accessToken)));
  });

  await t.test('refresh racing logout cannot leave an active family', async () => {
    const { tokens } = await login();
    const outcomes = await Promise.allSettled([auth.refreshToken(tokens.refreshToken), auth.logoutUser(tokens.refreshToken)]);
    assert.equal(outcomes[1].status, 'fulfilled');
    assert.equal(await active(principal(tokens.accessToken).sessionId), 0);
    assert.equal((await profile(tokens.accessToken)).status, 401);
  });

  await t.test('security change rollback preserves credentials and sessions; stale changes are rejected', async (context) => {
    const { tokens } = await login();
    const before = await User.findByPk(1);
    const update = context.mock.method(RefreshToken, 'update', async () => { throw new Error('simulated revocation failure'); });
    await assert.rejects(users.changeUserPassword(1, password, 'RollbackFixturePassword!42'), /simulated revocation failure/);
    update.mock.restore();
    assert.ok((await User.findByPk(1)).password === before.password);
    assert.equal((await profile(tokens.accessToken)).status, 200);
    const stale = await User.findByPk(1);
    await users.resetUserPassword(1, password, { userId: 3, role: 'admin', scope: 'admin' });
    stale.role = 'admin';
    await assert.rejects(sessions.saveSecurityChange(stale), { statusCode: 409, code: 'SECURITY_STATE_CHANGED' });
    assert.equal((await User.findByPk(1)).role, 'user');
  });

  await t.test('HTTP refresh sets successor cookies with matching absolute seven-day expiry', async () => {
    const res = await fetch(baseUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo_userA', password }) });
    assert.equal(res.status, 200);
    const cookies = res.headers.getSetCookie();
    const raw = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0].split('=')[1];
    const row = await RefreshToken.findOne({ where: { token: sessions.digest(raw) } });
    const expiry = cookies.find((c) => c.startsWith('refreshToken=')).match(/Expires=([^;]+)/)[1];
    assert.equal(new Date(expiry).getTime(), new Date(row.expires_at).getTime());
    assert.ok(new Date(row.expires_at).getTime() - Date.now() <= sessions.REFRESH_TTL_MS);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const refreshed = await fetch(baseUrl + '/auth/refresh-token', { method: 'POST', headers: { Cookie: `refreshToken=${raw}`, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.headers.getSetCookie().length, 2);
    assert.ok(!refreshed.headers.getSetCookie().find((c) => c.startsWith('refreshToken=')).startsWith(`refreshToken=${raw};`));
    assert.equal(refreshed.headers.getSetCookie().find((c) => c.startsWith('refreshToken=')).match(/Expires=([^;]+)/)[1], expiry);
  });
};
