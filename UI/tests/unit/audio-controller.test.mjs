import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioController } from '../../app/features/player/audioController.ts';
class FakeAudio extends EventTarget {
  src = ''; currentTime = 0; duration = 30; paused = true; ended = false; volume = 1;
  load() {} removeAttribute() { this.src = ''; }
  play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
test('actual playing gates listening callbacks; waiting/stalled/error stop accrual and offer recovery state', async () => {
  let plays = 0, progress = 0, suspends = 0;
  const controller = new AudioController(() => new FakeAudio(), () => {}, () => ({ onPlayNative: () => plays++, onTimeUpdateNative: () => progress++, onWaitingNative: () => suspends++ }));
  controller.load('/fixture.wav'); assert.equal(plays, 0);
  const audio = controller.element; await controller.play(); assert.equal(plays, 1);
  audio.emit('timeupdate'); assert.equal(progress, 1);
  audio.emit('waiting'); audio.emit('stalled'); audio.emit('timeupdate'); assert.equal(progress, 1); assert.equal(suspends, 2); assert.equal(controller.state.isBuffering, true);
  audio.emit('playing'); audio.emit('timeupdate'); assert.equal(progress, 2);
  audio.emit('error'); assert.ok(controller.state.error); assert.equal(controller.state.isPlaying, false);
  audio.emit('timeupdate'); assert.equal(progress, 2); controller.dispose();
});
test('play rejection is visible and never reports playback; late rejection/events from previous audio are ignored', async () => {
  let plays = 0;
  const controller = new AudioController(() => new FakeAudio(), () => {}, () => ({ onPlayNative: () => plays++ }));
  controller.load('/blocked.wav'); controller.element.play = () => Promise.reject({ name: 'NotAllowedError' });
  assert.equal(await controller.play(), false); assert.equal(plays, 0); assert.match(controller.state.error, /Trình duyệt/);
  const old = controller.element; let reject;
  old.play = () => new Promise((_, fail) => { reject = fail; }); const attempt = controller.play();
  controller.load('/new.wav'); reject(new Error('old source failed')); await attempt;
  old.currentTime = 99; old.emit('error'); old.emit('timeupdate'); assert.equal(controller.state.error, null); assert.equal(controller.state.currentTime, 0);
  controller.dispose();
});
test('ended is delivered once per load, restore seek waits for metadata, and volume/seek remain finite', async () => {
  let ended = 0;
  const controller = new AudioController(() => new FakeAudio(), () => {}, () => ({ onEndedNative: () => ended++ }));
  controller.load('/fixture.wav', 18); const audio = controller.element; assert.equal(audio.currentTime, 0);
  audio.emit('loadedmetadata'); assert.equal(audio.currentTime, 18);
  audio.emit('ended'); assert.equal(ended, 0); // Restored, paused media cannot auto-advance.
  await controller.play();
  audio.emit('ended'); audio.emit('ended'); assert.equal(ended, 1);
  controller.setVolume(NaN); assert.equal(audio.volume, .5);
  controller.setVolume(5); assert.equal(audio.volume, 1);
  controller.seek(-100); assert.equal(audio.currentTime, 0); controller.seek(Infinity); assert.equal(audio.currentTime, 0);
  controller.load(null); assert.equal(controller.element, null); assert.equal(controller.state.duration, 0);
});
