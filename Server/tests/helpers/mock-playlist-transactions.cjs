// Policy/controller unit tests keep all SQL blocked. Persistence and rollback
// semantics are tested separately with concurrent real MySQL transactions.
require('node:test').before((t) => {
  t.mock.method(require('../../src/models').sequelize, 'transaction', async (work) => work({ LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } }));
});
