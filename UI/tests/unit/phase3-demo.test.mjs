import test from 'node:test';
import assert from 'node:assert/strict';
import { readAudioMetadata } from '../../app/features/song/components/audio-metadata.ts';
import { pendingViewState } from '../../app/(Pages)/administrator/PendingSongs/pending-state.ts';

test('pending state: error excludes empty, including failed revalidation', () => {
  for (const count of [0, 2]) for (const isLoading of [false, true]) {
    assert.equal(pendingViewState({ error: new Error('offline'), isLoading, hasData: true, count }), 'error');
  }
  assert.equal(pendingViewState({ error: null, isLoading: false, hasData: false, count: 0 }), 'loading');
  assert.equal(pendingViewState({ error: null, isLoading: false, hasData: true, count: 0 }), 'empty');
  assert.equal(pendingViewState({ error: null, isLoading: false, hasData: true, count: 1 }), 'data');
});

function audioFixture(t) {
  const instances = [], revoked = [], results = [];
  class FakeAudio {
    handlers = {};
    duration = 28;
    constructor() { instances.push(this); }
    addEventListener(event, callback) { this.handlers[event] = callback; }
    removeEventListener(event) { delete this.handlers[event]; }
    removeAttribute() {}
    load() {}
  }
  t.mock.method(URL, 'createObjectURL', () => `blob:${instances.length}`);
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  const original = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  t.after(() => { if (original === undefined) delete globalThis.Audio; else globalThis.Audio = original; });
  const start = () => readAudioMetadata({}, seconds => results.push(seconds), () => results.push('error'));
  return { instances, revoked, results, start };
}

test('rapid file switch ignores queued stale metadata and error callbacks', t => {
  const f = audioFixture(t);
  const cancel = f.start();
  const staleLoaded = f.instances[0].handlers.loadedmetadata;
  const staleError = f.instances[0].handlers.error;
  cancel(); f.start(); staleLoaded(); staleError();
  assert.deepEqual(f.results, []);
  f.instances[1].duration = 26;
  f.instances[1].handlers.loadedmetadata();
  assert.deepEqual(f.results, [26]);
  assert.deepEqual(f.revoked, ['blob:1', 'blob:2']);
});
test('unreadable and invalid-duration audio reports error and revokes its URL', t => {
  const f = audioFixture(t);
  f.start(); f.instances[0].handlers.error();
  for (const duration of [0, NaN, Infinity]) {
    f.start(); const audio = f.instances.at(-1); audio.duration = duration; audio.handlers.loadedmetadata();
  }
  assert.deepEqual(f.results, ['error', 'error', 'error', 'error']);
  assert.equal(f.revoked.length, 4);
});
test('close/unmount cleanup is idempotent and blocks queued updates', t => {
  const f = audioFixture(t); const cleanup = f.start();
  const loaded = f.instances[0].handlers.loadedmetadata;
  cleanup(); cleanup(); loaded();
  assert.deepEqual(f.results, []);
  assert.deepEqual(f.revoked, ['blob:1']);
  assert.deepEqual(f.instances[0].handlers, {});
});
