const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateActivityScore } = require('../../src/services/recommendation/interactionScoring.service');
const { normalizedEvent, digestEvent } = require('../../src/services/user_activity.service');
test('normalized event digest is stable across order/defaults/UUID case, changed content differs', () => {
  const a = { event_version: 1, session_id: 'abcdef00-0000-4000-8000-000000000001', song_id: 1, source: 'search', exit_reason: 'ended', song_duration: 60, total_listened_time: 20 };
  const b = { ...Object.fromEntries(Object.entries(a).reverse()), session_id: a.session_id.toUpperCase(), seek_count: 0, play_pause_count: 0, max_position_reached: 0 };
  assert.equal(digestEvent(normalizedEvent(a)), digestEvent(normalizedEvent(b)));
  assert.notEqual(digestEvent(normalizedEvent(a)), digestEvent(normalizedEvent({ ...a, source: 'radio' })));
});
test('seek-to-end cannot earn completion bonus; invalid historical numbers stay finite', () => {
  const base = { total_listened_time: 1, song_duration: 60, max_position_reached: 60, exit_reason: 'ended', seek_count: 1, event_version: 1, qualified: false };
  assert.ok(calculateActivityScore(base) < 0.2);
  assert.equal(calculateActivityScore({ ...base, total_listened_time: NaN }), 0);
  assert.equal(calculateActivityScore({ ...base, song_duration: Infinity }), 0);
  assert.equal(calculateActivityScore({ ...base, total_listened_time: 60, seek_count: 0, qualified: true }), 8);
});
