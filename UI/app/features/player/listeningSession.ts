export type ActivitySource = 'search' | 'playlist' | 'recommendation' | 'radio';
export type ExitReason = 'ended' | 'skipped' | 'tab_closed';
export type ListeningEvent = Readonly<{ event_version: 1; session_id: string; song_id: number; source: ActivitySource;
  exit_reason: ExitReason; song_duration: number; total_listened_time: number; max_position_reached: number; play_pause_count: number; seek_count: number }>;
type TrackSnapshot = { id: number; duration: number; source: ActivitySource };
const finite = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
const round = (n: number) => Math.round(Math.min(86400, finite(n)) * 1000) / 1000;

export class ListeningSession {
  private track: TrackSnapshot | null = null;
  private id: string | null = null;
  private running = false;
  private seeking = false;
  private position = 0;
  private stamp = 0;
  private listened = 0;
  private maxPosition = 0;
  private pauses = 0;
  private seeks = 0;
  private played = false;
  constructor(private emit: (event: ListeningEvent) => void, private now = () => performance.now(), private uuid = () => crypto.randomUUID()) {}
  start(id: number, duration: number, source: ActivitySource) {
    this.finish('skipped'); // Snapshot A before assigning B's source.
    this.track = { id, duration: finite(duration), source };
    this.newSession();
  }
  private newSession() {
    this.id = this.uuid(); this.running = false; this.seeking = false; this.played = false;
    this.position = 0; this.stamp = this.now(); this.listened = 0; this.maxPosition = 0; this.pauses = 0; this.seeks = 0;
  }
  duration(value: number) { if (this.track && Number.isFinite(value) && value > 0) this.track.duration = value; }
  play(position: number) {
    if (!this.track) return;
    if (!this.id) this.newSession(); // Replay after ended/pagehide creates a new UUID.
    if (this.running) return;
    this.running = true; this.played = true; this.pauses = Math.min(32767, this.pauses + 1);
    this.position = finite(position); this.stamp = this.now();
  }
  tick(position: number) {
    const value = finite(position), now = this.now();
    if (this.running && !this.seeking) {
      // Media progress bounded by monotonic wall time: neither elapsed paused
      // time nor a forward seek is counted as listened audio.
      this.listened += Math.min(Math.max(0, value - this.position), Math.max(0, (now - this.stamp) / 1000));
      this.maxPosition = Math.max(this.maxPosition, value);
    }
    this.position = value; this.stamp = now;
  }
  suspend(position: number, userPause = false) {
    if (this.running) { this.tick(position); if (userPause) this.pauses = Math.min(32767, this.pauses + 1); }
    this.running = false;
  }
  seekingStart() { this.seeking = true; }
  seeked(position: number) {
    if (this.id) this.seeks = Math.min(32767, this.seeks + 1);
    this.position = finite(position); this.stamp = this.now(); this.seeking = false;
  }
  finish(reason: ExitReason, position?: number) {
    if (position !== undefined) this.tick(position);
    this.running = false;
    const track = this.track, id = this.id; this.id = null;
    if (!track || !id || !this.played) return;
    this.emit(Object.freeze({ event_version: 1, session_id: id, song_id: track.id, source: track.source, exit_reason: reason,
      song_duration: round(track.duration), total_listened_time: round(this.listened), max_position_reached: round(Math.min(this.maxPosition, track.duration)), play_pause_count: this.pauses, seek_count: this.seeks }));
  }
  discard() { this.id = null; this.track = null; this.running = false; }
  stop() { this.finish('skipped'); this.track = null; }
}
