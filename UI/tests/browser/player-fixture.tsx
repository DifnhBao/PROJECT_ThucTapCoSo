import { setPrincipal, toUser } from '../../app/lib/auth-state';
import React, { Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PlayerProvider, usePlayerControls } from '../../app/features/player/context/PlayerContext';
import TrackSection from '../../app/components/FeaturedPlaylists/TrackSection';
import Player from '../../app/features/player/components/Player';
import { LikeProvider } from '../../app/features/like/context/LikeContext';
import type { Track } from '../../app/types/music';
import '@fortawesome/fontawesome-free/css/all.min.css';

const track = (trackId: number): Track => ({ trackId, title: `Fixture ${trackId}`, audioUrl: trackId === 90 ? '/bad.wav' : `/audio/${trackId}.wav`, duration: 10, imageUrl: '/cover.png', artistName: 'Synthetic Artist', genre: 'Fixture', viewCount: 0, isVisible: true });
function Harness() {
  const player = usePlayerControls();
  const [showList, setShowList] = useState(false);
  return <main style={{ padding: 24, paddingBottom: 220, fontFamily: 'Arial, sans-serif' }}>
    <h1>Player smoke fixture</h1>
    <p>Local synthetic audio. Actual player/provider and HTTP requests; Next navigation is substituted.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <button onClick={() => player.setPlaylist([track(701), track(703)], 0, 'search')}>Search source</button>
      <button onClick={() => player.setPlaylist([track(702)], 0, 'recommendation')}>Recommendation source</button>
      <button onClick={() => player.setPlaylist([], 0)}>Empty</button>
      <button onClick={() => setShowList(true)}>Catalog list</button>
      <button onClick={() => player.setPlaylist([track(101), track(102)], 0)}>Finite</button>
      <button onClick={() => player.setPlaylist([track(101), track(102)], 1)}>Finite last</button>
      <button onClick={() => player.setPlaylist(Array.from({ length: 20 }, (_, i) => track(i + 1)), 19, 'radio', { nextPage: 2, hasMore: true, pageSize: 20 })}>Catalog</button>
      <button onClick={() => player.setPlaylist([track(90), track(91)], 0)}>Bad URL</button>
    </div>
    <output data-testid="state" style={{ display: 'block', overflowWrap: 'anywhere', fontSize: 12, marginTop: 12 }}>{JSON.stringify({ id: player.currentTrack?.trackId ?? null, playing: player.isPlaying, shuffle: player.isShuffle, repeat: player.repeatMode, buffering: player.isBuffering, error: player.audioError, queueError: player.queueError, loadingMore: player.loadingMore })}</output>
    {showList && <Profiler id="catalog" onRender={() => { document.documentElement.dataset.listCommits = String(Number(document.documentElement.dataset.listCommits || 0) + 1); }}><TrackSection /></Profiler>}
    <Player />
  </main>;
}
setPrincipal('user', toUser({ user_id: 1, username: 'Fixture' }));
document.body.style.cssText = 'margin:0;background:#f4f4f7;color:#17171c;--tt-text-primary:#17171c;--tt-text-muted:#555;--tt-surface:#fff;--tt-orange:#ac4a00';
createRoot(document.getElementById('root')!).render(<React.StrictMode><PlayerProvider><LikeProvider><Harness /></LikeProvider></PlayerProvider></React.StrictMode>);
