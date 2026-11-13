const { test } = require('node:test');
const assert = require('node:assert/strict');
const { userSignals, interactionMatrix } = require('../../src/services/recommendation/signals');
test('T14: short skips/legacy sessions are not positive; qualified repeats cap; explicit dislike vetoes', () => {
  const short = { song_id: 1, event_version: 1, qualified: false, total_listened_time: 1, song_duration: 100 };
  assert.equal(userSignals([short, { ...short, event_version: null, total_listened_time: 100 }], [], []).weights.size, 0);
  const full = { ...short, qualified: true, total_listened_time: 25 };
  assert.equal(userSignals(Array(20).fill(full), [], []).weights.get(1), 3);
  assert.equal(userSignals([full], [{ song_id: 1 }], [{ song_id: 1, score: 1 }]).weights.size, 0);
  assert.deepEqual([...userSignals([], [{ song_id: 2 }], [{ song_id: 3, score: 5 }]).weights], [[2, 5], [3, 2]]);
});
test('T14: two dislikes cannot create positive collaborative similarity', () => {
  const matrix = interactionMatrix([], [], [{ user_id: 1, song_id: 1, score: 1 }, { user_id: 1, song_id: 2, score: 1 }]);
  assert.equal(matrix.size, 0);
});
