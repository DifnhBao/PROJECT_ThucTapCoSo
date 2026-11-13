// Disposable integration process: NODE_ENV=test and guarded TEST_DB_* only.
require('../../config/test-database').getTestDatabaseConfig(process.env, { destructive: true });
require('../../src/server').startServer({ port: 0, host: '127.0.0.1' }).then(({ server }) => {
  process.send({ port: server.address().port });
}).catch(() => process.exit(1));
