import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePlayer } from '../../app/features/player/persistence.ts';
test('restore validates queue identity and cursor; v2 repeat maps to one without inventing catalog pagination', () => {
  assert.equal(restorePlayer('invalid'), null); assert.equal(restorePlayer('{"playlist":[{}]}'), null);
  const restored = restorePlayer(JSON.stringify({ playlist: [{ trackId: 1, title: 'Fixture', audioUrl: '/fixture.wav' }], index: 800, currentTime: -2, isRepeat: true, isShuffle: true }));
  assert.equal(restored.index, 0); assert.equal(restored.currentTime, 0); assert.equal(restored.repeatMode, 'one'); assert.equal(restored.pagination, undefined);
  const current = restorePlayer(JSON.stringify({ ...restored, repeatMode: 'all', source: 'radio', pagination: { nextPage: 2, hasMore: true, pageSize: 20 } }));
  assert.equal(current.repeatMode, 'all'); assert.equal(current.pagination.nextPage, 2);
});
