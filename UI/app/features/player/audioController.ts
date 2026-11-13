export type AudioEngineState = { isPlaying: boolean; isBuffering: boolean; currentTime: number; duration: number; error: string | null };
export type AudioEngineOptions = {
  onEndedNative?: (time: number) => void;
  onPlayNative?: (time: number) => void;
  onPauseNative?: (time: number) => void;
  onWaitingNative?: (time: number) => void;
  onTimeUpdateNative?: (time: number) => void;
  onDurationNative?: (duration: number) => void;
  onSeekingNative?: (time: number) => void;
  onSeekedNative?: (time: number) => void;
};
export const initialAudioState: AudioEngineState = { isPlaying: false, isBuffering: false, currentTime: 0, duration: 0, error: null };
const finite = (value: number) => Number.isFinite(value) && value >= 0 ? value : 0;

export class AudioController {
  element: HTMLAudioElement | null = null;
  state = { ...initialAudioState };
  private detach = () => {};
  private playIntent = 0;
  private volume = 0.5;
  constructor(private create: () => HTMLAudioElement, private changed: (state: AudioEngineState) => void, private options: () => AudioEngineOptions) {}
  private publish(update: Partial<AudioEngineState>) { this.state = { ...this.state, ...update }; this.changed(this.state); }
  private clear() {
    this.playIntent++; this.detach();
    if (this.element) { this.element.pause(); this.element.removeAttribute('src'); this.element.load(); }
    this.element = null;
  }
  dispose() { this.clear(); }
  load(url: string | null, startTime = 0) {
    this.clear();
    this.publish({ ...initialAudioState, isBuffering: Boolean(url) });
    if (!url) return;
    const audio = this.create(); this.element = audio; audio.volume = this.volume; audio.preload = 'metadata';
    let pendingSeek = finite(startTime), ended = false, hadPlayback = false;
    const listeners: [string, EventListener][] = [];
    const on = (name: string, fn: () => void) => { const listener = () => { if (this.element === audio) fn(); }; listeners.push([name, listener]); audio.addEventListener(name, listener); };
    const timing = () => ({ currentTime: finite(audio.currentTime), duration: finite(audio.duration) });
    on('loadedmetadata', () => {
      if (pendingSeek > 0) { audio.currentTime = Math.min(pendingSeek, finite(audio.duration)); pendingSeek = 0; }
      this.publish({ ...timing(), isBuffering: false }); this.options().onDurationNative?.(finite(audio.duration));
    });
    on('canplay', () => this.publish({ isBuffering: false }));
    on('playing', () => { if (audio.paused || audio.ended) return; hadPlayback = true; ended = false; this.publish({ isPlaying: true, isBuffering: false, error: null }); this.options().onPlayNative?.(audio.currentTime); });
    on('pause', () => { this.publish({ isPlaying: false, isBuffering: false }); this.options().onPauseNative?.(audio.currentTime); });
    for (const event of ['waiting', 'stalled']) on(event, () => { this.publish({ isBuffering: true }); this.options().onWaitingNative?.(audio.currentTime); });
    on('timeupdate', () => {
      this.publish(timing());
      if (this.state.isPlaying && !audio.paused && !audio.ended && !audio.seeking && !this.state.isBuffering && !this.state.error) this.options().onTimeUpdateNative?.(audio.currentTime);
    });
    on('seeking', () => this.options().onSeekingNative?.(audio.currentTime));
    on('seeked', () => this.options().onSeekedNative?.(audio.currentTime));
    on('ended', () => { if (ended || !hadPlayback || this.state.error) return; ended = true; this.publish({ ...timing(), isPlaying: false, isBuffering: false }); this.options().onEndedNative?.(audio.currentTime); });
    on('error', () => { hadPlayback = false; this.playIntent++; this.publish({ isPlaying: false, isBuffering: false, error: 'Không phát được bài hát. Bạn có thể thử lại hoặc bỏ qua.' }); this.options().onPauseNative?.(audio.currentTime); });
    this.detach = () => { for (const [name, listener] of listeners) audio.removeEventListener(name, listener); };
    audio.src = url; audio.load();
  }
  async play(): Promise<boolean> {
    const audio = this.element, intent = ++this.playIntent;
    if (!audio) return false;
    try { await audio.play(); return this.element === audio && intent === this.playIntent; }
    catch (error) {
      if (this.element !== audio || intent !== this.playIntent) return false;
      const blocked = (error as { name?: string }).name === 'NotAllowedError';
      this.publish({ isPlaying: false, isBuffering: false, error: blocked ? 'Trình duyệt chưa cho phép phát. Nhấn Thử lại để bắt đầu.' : 'Không phát được bài hát. Bạn có thể thử lại hoặc bỏ qua.' });
      this.options().onPauseNative?.(audio.currentTime);
      return false;
    }
  }
  pause() { this.playIntent++; this.element?.pause(); }
  seek(time: number) {
    if (!this.element || !Number.isFinite(time)) return;
    this.element.currentTime = Math.max(0, Math.min(time, finite(this.element.duration)));
  }
  setVolume(volume: number) { if (!Number.isFinite(volume)) return; this.volume = Math.max(0, Math.min(1, volume)); if (this.element) this.element.volume = this.volume; }
}
