"use client";
import useSWR from 'swr';
import { useAuthState } from '../../../lib/use-auth-state';
import { mapToPlaylist } from '../playlist.mapper';
import { getMyPlaylistsService } from '../service';
import type { Playlist } from '../types';
export function usePlaylists() {
  const auth = useAuthState('user');
  const key = auth.principal ? ['user', auth.principal.userId, auth.epoch, 'playlists'] : null;
  const { data, error, isLoading, mutate } = useSWR<Playlist[]>(key, async () => {
    const response = await getMyPlaylistsService();
    const rows = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    return rows.map(mapToPlaylist);
  });
  return { playlists: data ?? [], loading: isLoading, error: error instanceof Error ? error.message : null, fetchPlaylists: async () => { await mutate(); } };
}
