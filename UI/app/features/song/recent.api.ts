import { apiFetch } from '../../lib/api-transport';
import { readApiResponse } from '../../lib/api-contract';
import type { SongDto } from '../../types/api';
export type RecentSong = SongDto & { lastPlayedAt: string };
export type RecentPage = { items: RecentSong[]; nextCursor: string | null; hasMore: boolean };
export const recentKey = (userId: number, epoch: number, cursor = '') => ['recently-played', userId, epoch, cursor] as const;
export async function fetchRecent([, , , cursor]: ReturnType<typeof recentKey>): Promise<RecentPage> {
  return readApiResponse<RecentPage>(await apiFetch(`/api/activity/me/recent?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {}, 'user'));
}
export function recentItems(pages?: RecentPage[]) {
  return [...new Map((pages || []).flatMap((page) => page.items).map((song) => [song.song_id, song])).values()];
}
