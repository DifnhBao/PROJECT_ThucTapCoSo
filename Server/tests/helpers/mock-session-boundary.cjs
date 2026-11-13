// Unrelated controller/policy suites mock the session boundary explicitly.
// Session lifecycle and persistence are covered separately against real MySQL.
const { before } = require('node:test');
const sessions = require('../../src/services/session.service');
before((t) => {
  t.mock.method(sessions, 'validateAccessSession', async () => {});
  t.mock.method(sessions, 'saveSecurityChange', async (user) => user.save());
});
