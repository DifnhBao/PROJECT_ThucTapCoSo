'use client';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api-transport';
import { readApiResponse } from '../../../lib/api-contract';
import { useAuthState } from '../../../lib/use-auth-state';
import type { PlaylistDto, SongDto } from '../../../types/api';
import { mapSongToTrack } from '../../../utils/song.mapper';
import ResourceState from '../../../components/ui/ResourceState';
import DetailSong from './DetailSong/DetailSong';
import DetailView from '../../playlist/components/DetailView';
import { deletePlaylistService, removeSongFromPlaylistService } from '../../playlist/service';
export default function EntityDetail({ id, kind }: { id: string; kind: 'songs' | 'playlists' }) {
  const auth = useAuthState('user'), router = useRouter();
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState<unknown>();
  const valid = /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
  const { data, error, isLoading, mutate } = useSWR(valid ? [kind, id, auth.epoch] : null,
    async () => (await readApiResponse<{ data: SongDto | PlaylistDto }>(await apiFetch(`/api/${kind}/${id}`))).data, { shouldRetryOnError: false });
  if (!valid) return <p role="alert">ID không hợp lệ.</p>;
  if (error) return <ResourceState error={error} retry={() => { void mutate().catch(() => {}); }} />;
  if (isLoading || !data) return <ResourceState />;
  if ('song_id' in data) return <DetailSong key={id} track={mapSongToTrack(data)} />;
  const playlist = data;
  const owner = auth.principal?.userId === playlist.user_id;
  const change = async (songId?: number) => {
    if (busy || !window.confirm(songId ? 'Xóa bài khỏi playlist?' : 'Xóa playlist?')) return;
    setBusy(true); setFailure(undefined);
    try { if (songId) { await removeSongFromPlaylistService(Number(id), songId); await mutate(); }
      else { await deletePlaylistService(Number(id)); router.push('/Playlist'); } }
    catch (e) { setFailure(e); } finally { setBusy(false); }
  };
  const tracks = (playlist.songs ?? []).map(mapSongToTrack);
  return <><div aria-live="polite">{busy && 'Đang lưu…'}</div>{failure ? <ResourceState error={failure} /> : null}
    <fieldset disabled={busy} style={{ border: 0, padding: 0 }}><DetailView data={{ type: 'playlist', title: playlist.name, tracks, coverImages: tracks.map((t) => t.imageUrl).filter((s): s is string => Boolean(s)) }} onBack={() => router.push('/Playlist')}
      onRemoveSong={owner ? (songId) => { void change(songId); } : undefined} onDeletePlaylist={owner ? () => { void change(); } : undefined} /></fieldset>
    {!tracks.length && <p>Playlist chưa có bài hát.</p>}</>;
}
