import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserProvider, useUser } from '../../app/features/user/context/UserContext';
import { AdminUserProvider, useAdminUser } from '../../app/features/admin/context/AdminUserContext';
import { AccountCacheBoundary } from '../../app/lib/AccountCacheBoundary';
import { useAuthState } from '../../app/lib/use-auth-state';
import { loginApi, logoutApi } from '../../app/features/auth/api';
import { loginAdminApi } from '../../app/features/admin/api';
import { PlayerProvider, usePlayer } from '../../app/features/player/context/PlayerContext';
import { LikeProvider, useLikeContext } from '../../app/features/like/context/LikeContext';
import { usePlaylists } from '../../app/features/playlist/hooks/usePlaylists';
import { useUsers } from '../../app/features/user/useUsers';
import LibraryTable from '../../app/features/song/components/LibraryTable/LibraryTable';
import http from '../../app/lib/http';
import { userFetch, adminFetch } from '../../app/utils/refreshToken';
import { ModalProvider, useModal } from '../../app/context/ModalContext';
import { createSong, updateSong } from '../../app/features/song/song.api';
import { usePlaylistDetail } from '../../app/features/playlist/hooks/usePlaylistDetail';
function Actions() {
  const { user } = useUser(), { admin } = useAdminUser();
  const auth = useAuthState('user'), adminAuth = useAuthState('admin');
  const { openModal, modalData } = useModal();
  const [result, setResult] = useState('idle');
  const run = async (work: () => Promise<unknown>) => { setResult('working'); try { await work(); setResult('ok'); } catch { setResult('failed'); } };
  return <section>
    <output data-testid="account">{JSON.stringify({ user: user?.userId ?? null, admin: admin?.userId ?? null, userStatus: auth.status, adminStatus: adminAuth.status, result })}</output>
    <output data-testid="modal-data">{JSON.stringify(modalData)}</output>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button onClick={() => void run(() => loginApi('A', 'synthetic'))}>Login A</button>
      <button onClick={() => void run(() => loginApi('B', 'synthetic'))}>Login B</button>
      <button onClick={() => void run(() => loginAdminApi('admin', 'synthetic'))}>Login admin</button>
      <button onClick={() => void run(logoutApi)}>Logout user</button>
      <button onClick={() => openModal('profile', { marker: 'A-private-modal' })}>Open private modal</button>
      <button onClick={() => openModal('song-form', { song: { song_id: 501, title: 'Edit fixture one', duration: 60, audio_url: '/audio/501.wav', artists: [{ name: 'Artist one' }], genres: [{ name: 'Pop' }] }, onSave: async (data) => { if (data instanceof FormData) throw new Error('Expected metadata'); await updateSong(501, data); } })}>Edit fixture one</button>
      <button onClick={() => openModal('song-form', { song: { song_id: 502, title: 'Edit fixture two', duration: 90, audio_url: '/audio/502.wav', artists: [{ name: 'Artist two' }], genres: [{ name: 'Jazz' }] }, onSave: async (data) => { if (data instanceof FormData) throw new Error('Expected metadata'); await updateSong(502, data); } })}>Edit fixture two</button>
      <button onClick={() => openModal('song-form', { song: null, onSave: async (data) => { if (!(data instanceof FormData)) throw new Error('Expected file upload'); await createSong(data); } })}>New fixture song</button>
      <button onClick={() => void run(async () => {
        const values = await Promise.all([...Array.from({ length: 3 }, () => http.get('/private-probe')), ...Array.from({ length: 3 }, () => userFetch('/api/private-probe')), ...Array.from({ length: 2 }, () => http.get('/private-probe', { headers: { 'x-auth-type': 'admin' } })), ...Array.from({ length: 2 }, () => adminFetch('/api/private-probe'))]);
        if (values.some((value) => value.status !== 200)) throw new Error('Probe failed');
      })}>Concurrent probes</button>
      <button onClick={() => void run(() => userFetch('/api/private-probe'))}>User probe</button>
    </div>
  </section>;
}
function PrivateUser() {
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = usePlaylistDetail(detailId);
  const { likedMap, fetchLikeStatus } = useLikeContext();
  const { playlists, fetchPlaylists } = usePlaylists();
  const player = usePlayer();
  return <section>
    <output data-testid="likes">{JSON.stringify(likedMap)}</output>
    <output data-testid="playlists">{playlists.map((item) => item.name).join(',')}</output>
    <output data-testid="queue">{player.currentTrack?.trackId ?? 'empty'}</output>
    <output data-testid="playback">{player.isPlaying ? 'playing' : 'paused'}</output>
    <output data-testid="playlist-detail">{detail.playlist?.name ?? 'empty'}</output>
    <button onClick={() => setDetailId(1)}>Detail one</button><button onClick={() => setDetailId(2)}>Detail two</button>
    <button onClick={() => void fetchLikeStatus(99)}>Check99</button>
    <button onClick={() => void fetchLikeStatus(39)}>Check39</button>
    <button onClick={() => void fetchPlaylists().catch(() => {})}>Reload playlists</button>
    <button onClick={() => player.setPlaylist([{ trackId: 1, title: 'A song 1', duration: 10, audioUrl: '/audio/1.wav', artistName: 'Fixture', imageUrl: '/cover.png', genre: 'Fixture', viewCount: 0, isVisible: true }], 0)}>Queue song</button>
    <LibraryTable />
  </section>;
}
function PrivateAdmin() { const { users } = useUsers(); return <output data-testid="admin-cache">{users.map((user) => user.username).join(',')}</output>; }
const fixtureStyle = document.createElement('style'); fixtureStyle.textContent = 'output { display:block; overflow-wrap:anywhere; margin:8px 0; }'; document.head.appendChild(fixtureStyle);
document.body.style.cssText = 'font-family:Arial,sans-serif;background:#f4f4f7;margin:24px;color:#17171c';
createRoot(document.getElementById('root')!).render(<React.StrictMode><UserProvider><AdminUserProvider><ModalProvider>
  <h1>Account and library verification</h1><Actions />
  <AccountCacheBoundary scope="user"><PlayerProvider><LikeProvider><PrivateUser /></LikeProvider></PlayerProvider></AccountCacheBoundary>
  <AccountCacheBoundary scope="admin"><PrivateAdmin /></AccountCacheBoundary>
</ModalProvider></AdminUserProvider></UserProvider></React.StrictMode>);
