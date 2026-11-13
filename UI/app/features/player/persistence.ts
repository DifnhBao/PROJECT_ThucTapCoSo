import type { Track } from '../../types/music';
import type { ActivitySource } from './hook/useActivityLogger';
import type { QueuePagination } from './queuePager';
export type RepeatMode = 'off' | 'one' | 'all';
export type SavedPlayer = { playlist: Track[]; index: number; currentTime: number; isShuffle: boolean; repeatMode: RepeatMode; source: ActivitySource; pagination?: QueuePagination };
export function restorePlayer(raw: string | null): SavedPlayer | null {
  if (!raw || raw.length > 2000000) return null;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value.playlist) || !value.playlist.length || value.playlist.length > 1000) return null;
    if (!value.playlist.every((t: Track) => t && Number.isSafeInteger(t.trackId) && t.trackId > 0 && typeof t.title === 'string' && typeof t.audioUrl === 'string')) return null;
    const pagination = value.pagination;
    const validPage = pagination && Number.isInteger(pagination.nextPage) && pagination.nextPage >= 1 && pagination.nextPage <= 1000000 && typeof pagination.hasMore === 'boolean' && Number.isInteger(pagination.pageSize) && pagination.pageSize > 0 && pagination.pageSize <= 100;
    return { playlist: value.playlist, index: Number.isInteger(value.index) ? Math.max(0, Math.min(value.index, value.playlist.length - 1)) : 0,
      currentTime: Number.isFinite(value.currentTime) ? Math.max(0, value.currentTime) : 0, isShuffle: value.isShuffle === true,
      repeatMode: ['off', 'one', 'all'].includes(value.repeatMode) ? value.repeatMode : value.isRepeat ? 'one' : 'off',
      source: ['search', 'playlist', 'recommendation', 'radio'].includes(value.source) ? value.source : 'playlist',
      ...(validPage ? { pagination } : {}) };
  } catch { return null; }
}
