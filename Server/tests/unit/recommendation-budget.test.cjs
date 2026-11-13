const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Song, UserActivity, Favorite, Rating } = require('../../src/models');
const rec = require('../../src/services/recommendation/recommendation.service');
const repository = require('../../src/services/recommendation/snapshot.repository');
test('T14: missing snapshot returns empty similar without metadata or realtime matrix', async (t) => {
  t.mock.method(Song, 'findOne', async () => ({ song_id: 1 }));
  t.mock.method(repository, 'readNeighbors', async () => []);
  t.mock.method(Song, 'findByPk', async () => { throw new Error('No per-song hydration'); });
  const find = t.mock.method(Song, 'findAll', async () => { throw new Error('No catalog fallback'); });
  assert.deepEqual(await rec.getSimilarSongs(1, 10), []);
  assert.equal(find.mock.callCount(), 0);
});
test('T14: cold start signal reads are scoped, qualified and bounded', async (t) => {
  for (const model of [UserActivity, Favorite, Rating]) t.mock.method(model, 'findAll', async (options) => {
    assert.equal(options.where.user_id, 7); assert.equal(options.limit, 200);
    if (model === UserActivity) assert.deepEqual(options.where, { user_id: 7, event_version: 1, qualified: true });
    return [];
  });
  const find = t.mock.method(Song, 'findAll', async (options) => {
    assert.equal(options.limit, 2); assert.equal(options.where.status, 'approved'); return [];
  });
  assert.deepEqual(await rec.getRecommendationsForUser(7, 2), []);
  assert.equal(find.mock.callCount(), 1);
});
