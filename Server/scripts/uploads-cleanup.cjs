const { loadEnvironment, getRuntimeConfig } = require('../src/config/env');
loadEnvironment(); getRuntimeConfig();
const { sequelize } = require('../src/models');
const files = require('../src/services/upload-files');
const uploads = require('../src/services/upload.service');
(async () => {
  if (process.argv.slice(2).some((arg) => arg !== '--recover-stale-writers-stopped')) throw new Error('Unknown cleanup option');
  const result = await uploads.retryCleanup({ recoverStale: process.argv.includes('--recover-stale-writers-stopped') });
  const temp = await files.retryTempCleanup();
  if (result.pending || temp.pending) process.exitCode = 1;
  console.log(JSON.stringify({ ...result, tempPending: temp.pending }));
})().catch(() => { console.error('Upload cleanup incomplete; check durable jobs/journal before retry'); process.exitCode = 1; }).finally(() => sequelize.close());
