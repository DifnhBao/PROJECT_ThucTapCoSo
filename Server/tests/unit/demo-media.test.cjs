const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { demoTrack, createDemoWav, TRACK_COUNT } = require('../../database/demo-media.cjs');
test('every local demo track exceeds qualified listen threshold with distinct PCM', () => {
  const hashes = new Set();
  for (let id = 1; id <= TRACK_COUNT; id++) {
    const track = demoTrack(id);
    const wav = createDemoWav(id);
    const seconds = wav.readUInt32LE(40) / wav.readUInt32LE(28);
    assert.equal(seconds, track.duration);
    assert.ok(seconds >= 25 && seconds <= 30);
    assert.ok(seconds > 20);
    assert.equal(wav.readUInt32LE(4), wav.length - 8);
    hashes.add(createHash('sha256').update(wav.subarray(44, 8044)).digest('hex'));
  }
  assert.equal(hashes.size, TRACK_COUNT);
});
test('explicit short audio fixtures stay fast', () => {
  assert.equal(createDemoWav(1, 0.1).length, 44 + 800 * 2);
});
