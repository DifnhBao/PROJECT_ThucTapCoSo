const { test } = require('node:test');
const assert = require('node:assert/strict');
const { contracts } = require('../../src/validation/contracts');
test('activity fields reject non-finite, negative, fractional counters and forged identity before ingestion', () => {
  const schema = contracts.activity.logActivity.body;
  const valid = { song_id: 1, event_version: 1, session_id: '10000000-0000-4000-8000-000000000001', source: 'search', exit_reason: 'ended', song_duration: 180, total_listened_time: 60, max_position_reached: 60 };
  assert.equal(schema.safeParse(valid).success, true);
  for (const value of [{ total_listened_time: Infinity }, { total_listened_time: NaN }, { total_listened_time: -1 }, { seek_count: 1.5 }, { max_position_reached: 181 }, { user_id: 2 }, { created_at: '2026-01-01' }]) assert.equal(schema.safeParse({ ...valid, ...value }).success, false);
});
test('password boundary enforces bcrypt byte limit and profile dates/enums are validated', () => {
  const credentials = contracts.auth.login.body;
  assert.equal(credentials.safeParse({ username: 'synthetic', password: 'a'.repeat(72) }).success, true);
  assert.equal(credentials.safeParse({ username: 'synthetic', password: 'a'.repeat(73) }).success, false);
  assert.equal(credentials.safeParse({ username: 'synthetic', password: '😀'.repeat(19) }).success, false);
  const profile = contracts.users.updateUserProfile.body;
  for (const body of [{ dateOfBirth: '2026-02-30' }, { gender: 'admin' }, { phone: 'letters' }, { role: 'admin' }]) assert.equal(profile.safeParse(body).success, false);
  assert.equal(profile.safeParse({ gender: '', dateOfBirth: '', firstName: null }).success, true);
});
