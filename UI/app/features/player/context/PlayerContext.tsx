"use client";
import React,{ createContext,useCallback,useContext,useEffect,useMemo,useRef,useState } from 'react';
import { getAuth } from '../../../lib/auth-state';
import { useAuthState } from '../../../lib/use-auth-state';
import type { Track } from '../../../types/music';
import { fetchDailySongs } from '../../song/song.api';
import { useActivityLogger,type ActivitySource } from '../hook/useActivityLogger';
import { useAudioEngine } from '../hook/useAudioEngine';
import { restorePlayer,type RepeatMode } from '../persistence';
import { PlayerService } from '../playerService';
import { QueuePager,type PagerState,type QueuePagination } from '../queuePager';

type PlayerContextType = {
  currentTrack: Track | null; isPlaying: boolean; isBuffering: boolean; audioError: string | null; queueError: string | null; loadingMore: boolean;
  play: () => void; pause: () => void; togglePlay: () => void; retryAudio: () => void; retryQueue: () => Promise<void>;
  setPlaylist: (tracks: Track[], index: number, source?: ActivitySource, pagination?: QueuePagination) => void;
  next: () => Promise<void>; prev: () => void;
  audioState: { currentTime: number; duration: number }; seek: (time: number) => void; setVolume: (volume: number) => void;
  isShuffle: boolean; toggleShuffle: () => void; isRepeat: boolean; repeatMode: RepeatMode; toggleRepeat: () => void;
};
type PlayerControls = Omit<PlayerContextType, 'audioState'>;
const PlayerContext = createContext<PlayerControls | null>(null);
const ProgressContext = createContext<PlayerContextType['audioState'] | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState('user');
  const [service] = useState(() => new PlayerService());
  const [pagerState, setPagerState] = useState<PagerState>({ loading: false, hasMore: false, error: null });
  const [pager] = useState(() => new QueuePager(service, fetchDailySongs, setPagerState));
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const trackRef = useRef<Track | null>(null);
  const sourceRef = useRef<ActivitySource>('playlist');
  const navigation = useRef(0);
  const nextFlight = useRef<Promise<void> | null>(null);
  const endedRef = useRef<() => void>(() => {});
  const [isShuffle, setIsShuffle] = useState(false);
  const shuffleRef = useRef(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const repeatRef = useRef<RepeatMode>('off');
  const { initTrack, stopTrack, handlePlay, handlePause, handleSuspend, handleTimeUpdate, handleSeeking, handleSeek, handleDuration, handleEnded } = useActivityLogger('playlist');
  const { state, load, play: enginePlay, pause, seek, setVolume } = useAudioEngine({
    onEndedNative: (position) => { handleEnded(position); endedRef.current(); }, onPlayNative: handlePlay, onPauseNative: handlePause,
    onWaitingNative: handleSuspend, onTimeUpdateNative: handleTimeUpdate, onSeekingNative: handleSeeking, onSeekedNative: handleSeek, onDurationNative: handleDuration,
  });
  const timeRef = useRef(0);
  useEffect(() => { timeRef.current = state.currentTime; }, [state.currentTime]);

  const loadTrack = useCallback((track: Track | null, autoPlay = true, startTime = 0) => {
    trackRef.current = track; setCurrentTrack(track);
    if (!track) { stopTrack(); load(null); return; }
    initTrack(track.trackId, track.duration || 0, sourceRef.current);
    // Empty/invalid URLs remain recoverable rather than leaving the previous song playing.
    load(track.audioUrl || '/api/media/unavailable', startTime);
    if (autoPlay) void enginePlay();
  }, [initTrack, stopTrack, load, enginePlay]);
  const setPlaylist = useCallback((tracks: Track[], index: number, source: ActivitySource = 'playlist', pagination?: QueuePagination) => {
    navigation.current++; nextFlight.current = null; sourceRef.current = source;
    service.setPlaylist(tracks, index); pager.reset(pagination);
    loadTrack(service.getCurrentTrack());
  }, [service, pager, loadTrack]);
  const next = useCallback((): Promise<void> => {
    if (nextFlight.current) return nextFlight.current;
    const intent = ++navigation.current, generation = pager.generation;
    const task = (async () => {
      if (!service.getCurrentTrack()) return;
      let track = service.next();
      if (!track && pager.state.hasMore) {
        await pager.loadNext();
        if (generation !== pager.generation || intent !== navigation.current) return;
        track = service.next();
      }
      if (!track && !pager.state.hasMore && repeatRef.current === 'all') track = service.next(true);
      if (track) loadTrack(track); else pause();
    })().finally(() => { if (nextFlight.current === task) nextFlight.current = null; });
    nextFlight.current = task;
    return task;
  }, [service, pager, loadTrack, pause]);
  useEffect(() => { endedRef.current = () => {
    if (repeatRef.current === 'one') loadTrack(service.getCurrentTrack());
    else void next();
  }; }, [service, loadTrack, next]);
  const prev = useCallback(() => {
    navigation.current++; nextFlight.current = null;
    if (timeRef.current > 3) { seek(0); return; }
    const track = service.prev(repeatRef.current === 'all') || service.getCurrentTrack();
    if (track) loadTrack(track);
  }, [service, loadTrack, seek]);
  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current; service.setShuffle(shuffleRef.current); setIsShuffle(shuffleRef.current);
  }, [service]);
  const toggleRepeat = useCallback(() => {
    repeatRef.current = repeatRef.current === 'off' ? 'one' : repeatRef.current === 'one' ? 'all' : 'off'; setRepeatMode(repeatRef.current);
  }, []);
  const retryAudio = useCallback(() => { navigation.current++; nextFlight.current = null; if (trackRef.current) { load(trackRef.current.audioUrl || "/api/media/unavailable", timeRef.current); void enginePlay(); } }, [load, enginePlay]);
  const retryQueue = useCallback(async () => { await pager.loadNext(true); }, [pager]);
  const play = useCallback(() => { void enginePlay(); }, [enginePlay]);
  const togglePlay = useCallback(() => { if (state.isPlaying) pause(); else void enginePlay(); }, [state.isPlaying, pause, enginePlay]);

  // One prefetch per track transition, never an effect keyed by loading/error state.
  useEffect(() => { if (currentTrack && service.remaining() <= 2) void pager.loadNext(); }, [currentTrack, service, pager]);
  useEffect(() => () => { pager.dispose(); navigation.current++; }, [pager]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || auth.status === 'unknown' || auth.status === 'changing') return;
      let saved;
      try { const raw = localStorage.getItem('player_state_v3'); if (!raw || JSON.parse(raw)?.owner !== (auth.principal?.userId ?? null)) return; saved = restorePlayer(raw); } catch { return; }
      if (!saved) return;
      sourceRef.current = saved.source; repeatRef.current = saved.repeatMode; setRepeatMode(saved.repeatMode);
      shuffleRef.current = saved.isShuffle; service.setShuffle(saved.isShuffle); setIsShuffle(saved.isShuffle);
      service.setPlaylist(saved.playlist, saved.index); pager.reset(saved.pagination);
      loadTrack(service.getCurrentTrack(), false, saved.currentTime); // Restore paused; respect browser autoplay policy.
    });
    return () => { active = false; };
  }, [service, pager, loadTrack, auth.epoch, auth.status, auth.principal?.userId]);
  useEffect(() => {
    const save = () => {
      try {
        const auth = getAuth('user'); if (auth.status === 'unknown' || auth.status === 'changing') return;
        const list = service.getPlaylist(), index = service.getOriginalIndex();
        if (!list.length) { localStorage.removeItem('player_state_v3'); localStorage.removeItem('player_state_v2'); return; }
        const start = Math.max(0, index - 500);
        localStorage.setItem('player_state_v3', JSON.stringify({ owner: auth.principal?.userId ?? null, playlist: list.slice(start, start + 1000), index: index - start, currentTime: timeRef.current,
          isShuffle: shuffleRef.current, repeatMode: repeatRef.current, source: sourceRef.current, pagination: pager.snapshot() }));
      } catch { /* Storage unavailable must not interrupt playback. */ }
    };
    const timer = setInterval(save, 5000); window.addEventListener('pagehide', save);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', save); };
  }, [service, pager]);

  const controls = useMemo<PlayerControls>(() => ({ currentTrack, isPlaying: state.isPlaying, isBuffering: state.isBuffering, audioError: state.error,
    queueError: pagerState.error, loadingMore: pagerState.loading, play, pause, togglePlay, setPlaylist, next, prev, retryAudio, retryQueue,
    seek, setVolume, isShuffle, toggleShuffle, isRepeat: repeatMode !== 'off', repeatMode, toggleRepeat }),
    [currentTrack, state.isPlaying, state.isBuffering, state.error, pagerState.error, pagerState.loading, play, pause, togglePlay, setPlaylist, next, prev, retryAudio, retryQueue, seek, setVolume, isShuffle, toggleShuffle, repeatMode, toggleRepeat]);
  const progress = useMemo(() => ({ currentTime: state.currentTime, duration: state.duration }), [state.currentTime, state.duration]);
  return <PlayerContext.Provider value={controls}><ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider></PlayerContext.Provider>;
}
export function usePlayerControls() { const context = useContext(PlayerContext); if (!context) throw new Error('usePlayerControls must be used inside PlayerProvider'); return context; }
export function usePlayerProgress() { const context = useContext(ProgressContext); if (!context) throw new Error('usePlayerProgress must be used inside PlayerProvider'); return context; }
// Compatibility for the player UI and existing integrations requiring both subscriptions.
export function usePlayer() { return { ...usePlayerControls(), audioState: usePlayerProgress() }; }
