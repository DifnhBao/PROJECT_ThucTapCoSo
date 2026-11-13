"use client";
import { useCallback } from 'react';
import useSWR from 'swr';
import { useAuthState } from '../../../lib/use-auth-state';
import { mapToPlaylist } from '../playlist.mapper';
import { getPlaylistDetailService } from '../service';
export function usePlaylistDetail(playlistId?: number | null) {
  const auth = useAuthState('user');
  const { data, error, isLoading, mutate } = useSWR(playlistId ? ['playlist-detail', auth.principal?.userId ?? 'guest', auth.epoch, playlistId] : null,
    async () => mapToPlaylist((await getPlaylistDetailService(playlistId!)).data));
  const fetchPlaylistDetail = useCallback(async () => { await mutate(); }, [mutate]);
  return { playlist: data ?? null, loading: isLoading, error: error instanceof Error ? error.message : null, fetchPlaylistDetail };
}
