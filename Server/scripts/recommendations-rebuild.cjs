const { sequelize } = require('../src/models');
const { rebuild } = require('../src/services/recommendation/snapshot.service');
(async () => {
  try { console.log(JSON.stringify(await rebuild(), null, 2)); }
  catch (error) { console.error(error.code || 'REBUILD_FAILED', error.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
