// Dedicated destructive benchmark fixture; same strict database safeguards as full integration.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('../../config/test-database').getTestDatabaseConfig(process.env, { destructive: true });
after(async () => { await require('../../src/models').sequelize.close(); });
test('T14: disposable MySQL recommendation verification', { timeout: 180000 }, async (t) => {
  await require('./reset-test-database.cjs')();
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/db-migrate.cjs'), '--env', 'test'], { env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, 'Test migrations must succeed');
  await require('../../database/seed.cjs').seed('test');
  await require('../integration/recommendation-snapshots.cjs')(t);
});
