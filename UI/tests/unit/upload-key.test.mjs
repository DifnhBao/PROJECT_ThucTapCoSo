import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadKey } from '../../app/lib/upload-key.ts';
const form = (title = 'Fixture', bytes = 'synthetic') => { const value = new FormData(); value.set('title', title); value.set('audioFile', new Blob([bytes]), 'fixture.wav'); return value; };
test('upload retries reuse a key across recreated FormData; successful completion starts a new intent', async () => {
  const a = await uploadKey(form(), 'user-song');
  const b = await uploadKey(form(), 'user-song');
  assert.equal(a.key, b.key);
  assert.notEqual((await uploadKey(form('Changed'), 'user-song')).key, a.key);
  assert.notEqual((await uploadKey(form('Fixture', 'different bytes'), 'user-song')).key, a.key);
  assert.notEqual((await uploadKey(form(), 'admin-song')).key, a.key);
  a.done();
  assert.notEqual((await uploadKey(form(), 'user-song')).key, a.key);
});
