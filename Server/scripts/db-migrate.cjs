const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
const target = args.length === 2 && args[0] === '--env' ? args[1] : null;
if (!['test', 'development', 'production'].includes(target)) {
  console.error('Specify --env test|development|production; no implicit database target');
  process.exit(1);
}
process.env.NODE_ENV = target;
const { loadEnvironment, getDatabaseConfig } = require('../src/config/env');
try {
  loadEnvironment();
  if (target === 'test') require('../config/test-database').getTestDatabaseConfig(process.env, { destructive: true });
  else {
    if (!process.env.MIGRATION_DB_USER || !process.env.MIGRATION_DB_PASS) throw new Error('Explicit MIGRATION_DB_USER and MIGRATION_DB_PASS required for DDL; runtime account is not used');
    process.env.DB_USER = process.env.MIGRATION_DB_USER;
    process.env.DB_PASS = process.env.MIGRATION_DB_PASS;
  }
  getDatabaseConfig();
  const result = spawnSync(process.execPath, [require.resolve('sequelize-cli/lib/sequelize'), 'db:migrate', '--env', target, '--config', path.resolve(__dirname, '../config/config.js'), '--migrations-path', path.resolve(__dirname, '../migrations')], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
