const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedConfig } = require('../../database/seed.cjs');
test('seed guards refuse production, missing opt-in, wrong database/host and missing password before connecting', () => {
  const env = { NODE_ENV: 'test', TEST_DB_NAME: 'tunetrek_test_t04', TEST_DB_HOST: '127.0.0.1', TEST_DB_PORT: '3307', TEST_DB_USER: 'test', TEST_DB_PASS: '', TEST_DB_RESET_ALLOWED: 'yes', TEST_SEED_PASSWORD: 'isolated-fixture-password' };
  assert.equal(seedConfig('test', env).database.database, 'tunetrek_test_t04');
  assert.equal(seedConfig('test', { ...env, DEMO_ADMIN_PASSWORD: 'ignored-by-test-seed' }).adminPassword, undefined);
  for (const overrides of [{ NODE_ENV: 'production' }, { TEST_DB_NAME: 'production' }, { TEST_DB_HOST: 'remote.example' }, { TEST_DB_RESET_ALLOWED: 'no' }, { TEST_SEED_PASSWORD: '' }]) assert.throws(() => seedConfig('test', { ...env, ...overrides }));
  assert.throws(() => seedConfig('demo', { NODE_ENV: 'production', DEMO_SEED_ALLOWED: 'yes' }));
  assert.throws(() => seedConfig('demo', { NODE_ENV: 'development' }));
  const demo = { NODE_ENV: 'development', DEMO_SEED_ALLOWED: 'yes', DB_HOST: '127.0.0.1', DB_PORT: '3307', DB_USER: 'demo', DB_PASS: 'local-only', DB_NAME: 'tunetrek_demo', DEMO_SEED_PASSWORD: 'isolated-listener-password', DEMO_ADMIN_PASSWORD: 'isolated-admin-password' };
  assert.equal(seedConfig('demo', demo).database.database, 'tunetrek_demo');
  assert.throws(() => seedConfig('demo', { ...demo, DB_NAME: 'tunetrek' }));
  assert.throws(() => seedConfig('demo', { ...demo, DB_HOST: 'remote.example' }));
  for (const name of ['DEMO_SEED_PASSWORD', 'DEMO_ADMIN_PASSWORD']) {
    for (const invalid of [undefined, 'short', 'replace-with-demo-password', '🎵'.repeat(6), 'é'.repeat(36) + 'a']) {
      assert.throws(() => seedConfig('demo', { ...demo, [name]: invalid }), new RegExp(name));
    }
  }
  assert.throws(() => seedConfig('demo', { ...demo, DEMO_ADMIN_PASSWORD: demo.DEMO_SEED_PASSWORD }), /must be different/);
});
