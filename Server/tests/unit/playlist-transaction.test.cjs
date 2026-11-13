const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UniqueConstraintError } = require('sequelize');
const { sequelize } = require('../../src/models');
const { playlistTransaction } = require('../../src/services/playlist-transaction');
test('known lock failure retries the managed transaction; bounded exhaustion is a domain conflict', async (t) => {
  let calls = 0;
  const run = t.mock.method(sequelize, 'transaction', async () => { if (++calls < 3) throw { original: { errno: 1213 } }; return 'committed'; });
  assert.equal(await playlistTransaction(() => {}), 'committed');
  assert.equal(calls, 3);
  run.mock.mockImplementation(async () => { throw { original: { errno: 1205 } }; });
  await assert.rejects(playlistTransaction(() => {}), { statusCode: 409, code: 'PLAYLIST_BUSY' });
  assert.equal(run.mock.callCount(), 6);
});
test('unique constraint is409; ambiguous commit/network errors are never automatically replayed', async (t) => {
  const run = t.mock.method(sequelize, 'transaction', async () => { throw new UniqueConstraintError({ errors: [] }); });
  await assert.rejects(playlistTransaction(() => {}), { statusCode: 409, code: 'PLAYLIST_CONFLICT' });
  const failure = Object.assign(new Error('synthetic commit acknowledgement lost'), { original: { code: 'ECONNRESET' } });
  run.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(playlistTransaction(() => {}), (error) => error === failure);
  assert.equal(run.mock.callCount(), 2);
});
