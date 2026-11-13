import type { Track } from '../../types/music';
import { PlayerService } from './playerService';
export type QueuePage = { songs: Track[]; page: number; limit: number; total: number };
export type QueuePagination = { nextPage: number; hasMore: boolean; pageSize?: number };
export type PagerState = { loading: boolean; hasMore: boolean; error: string | null };

export class QueuePager {
  generation = 0;
  private pagination: QueuePagination | null = null;
  private flight: Promise<boolean> | null = null;
  private abort: AbortController | null = null;
  private failed = false;
  state: PagerState = { loading: false, hasMore: false, error: null };
  constructor(private player: PlayerService, private fetchPage: (limit: number, page: number, signal: AbortSignal) => Promise<QueuePage>, private changed: (state: PagerState) => void = () => {}) {}
  private publish(update: Partial<PagerState>) { this.state = { ...this.state, ...update }; this.changed(this.state); }
  reset(pagination?: QueuePagination) {
    this.generation++; this.abort?.abort(); this.abort = null; this.flight = null; this.failed = false;
    this.pagination = pagination ? { nextPage: Math.max(1, Math.floor(pagination.nextPage)), hasMore: pagination.hasMore, pageSize: pagination.pageSize || 20 } : null;
    this.publish({ loading: false, hasMore: this.pagination?.hasMore ?? false, error: null });
  }
  snapshot(): QueuePagination | undefined { return this.pagination ? { ...this.pagination } : undefined; }
  dispose() { this.generation++; this.abort?.abort(); this.abort = null; this.flight = null; }
  loadNext(explicitRetry = false): Promise<boolean> {
    if (this.flight) return this.flight;
    if (!this.pagination?.hasMore || !this.player.getPlaylist().length || (this.failed && !explicitRetry)) return Promise.resolve(false);
    const generation = this.generation, page = this.pagination.nextPage, limit = this.pagination.pageSize || 20;
    const controller = new AbortController(); this.abort = controller;
    this.failed = false; this.publish({ loading: true, error: null });
    const task = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await this.fetchPage(limit, page, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
          if (generation !== this.generation || controller.signal.aborted) return false;
          if (!Array.isArray(result.songs) || result.page !== page || !Number.isFinite(result.total) || result.total < 0) throw new Error('Invalid queue page');
          const count = this.player.getPlaylist().length;
          this.player.appendTracks(result.songs);
          const progressed = this.player.getPlaylist().length > count;
          this.pagination = { nextPage: page + 1, pageSize: limit, hasMore: progressed && this.player.getPlaylist().length < result.total };
          this.publish({ hasMore: this.pagination.hasMore, error: null });
          return progressed;
        } catch (error) {
          if (generation !== this.generation || controller.signal.aborted) return false;
          const status = (error as { status?: number }).status;
          if (attempt === 0 && !(status && status >= 400 && status < 500)) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            if (generation !== this.generation || controller.signal.aborted) return false;
          } else {
            this.failed = true;
            this.publish({ error: 'Không tải được bài tiếp theo. Vui lòng thử lại.' });
            return false;
          }
        }
      }
      return false;
    })().finally(() => {
      if (this.flight === task) { this.flight = null; this.abort = null; this.publish({ loading: false }); }
    });
    this.flight = task;
    return task;
  }
}
