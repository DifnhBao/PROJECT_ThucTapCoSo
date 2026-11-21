"use client";
import { useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import { usePlayerControls } from '../../player/context/PlayerContext';
import { subscribeRecentActivity } from '../../player/recentActivity';
import { mapSongToTrack } from '../../../utils/song.mapper';
import { fetchRecent, recentKey, recentItems, type RecentPage } from '../recent.api';
import RecentlyPlayed from './RecentlyPlayed';

export default function RecentHistory({ userId, epoch }: { userId: number; epoch: number }) {
  const { setPlaylist } = usePlayerControls();
  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite<RecentPage>(
    (index, previous: RecentPage | null) => index > 0 && (!previous?.hasMore || !previous.nextCursor) ? null : recentKey(userId, epoch, previous?.nextCursor || ''),
    fetchRecent, { revalidateFirstPage: false, shouldRetryOnError: false },
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeRecentActivity((receiptEpoch) => {
      if (receiptEpoch !== epoch) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void mutate(); }, 300);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [epoch, mutate]);
  const items = data ? recentItems(data) : undefined;
  const last = data?.at(-1);
  const pageError = !!error && !!data && size > data.length;
  return <RecentlyPlayed items={items} hasError={!!error && !pageError} onRetry={() => { void mutate(); }}
    hasMore={!!last?.hasMore && !!last.nextCursor} loadingMore={isValidating && size > (data?.length || 0)} pageError={pageError}
    onLoadMore={() => { if (pageError) void mutate(); else void setSize(size + 1); }}
    onPlay={(index) => setPlaylist((items || []).map(mapSongToTrack), index, 'playlist')} />;
}
