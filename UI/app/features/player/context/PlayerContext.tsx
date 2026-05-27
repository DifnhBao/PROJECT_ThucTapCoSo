"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAudioEngine } from "@/app/features/player/hook/useAudioEngine";
import { PlayerService } from "@/app/features/player/playerService";
import type { Track } from "@/app/types/music";
import { fetchDailySongs } from "@/app/features/song/song.api";
import { useActivityLogger, ActivitySource } from "@/app/features/player/hook/useActivityLogger";

type PlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setPlaylist: (tracks: Track[], index: number, source?: ActivitySource) => void;
  next: () => Promise<void>;
  prev: () => void;
  audioState: { currentTime: number; duration: number };
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  isRepeat: boolean;
  toggleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerServiceRef = useRef(new PlayerService());

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreRef = useRef<(() => Promise<void>) | null>(null);
  const nextRef = useRef<(() => Promise<void>) | null>(null);
  const loadTrackRef = useRef<
    ((track: Track | null, autoPlay?: boolean, source?: ActivitySource) => void) | null
  >(null);

  // --- ACTIVITY SOURCE STATE ---
  const activitySourceRef = useRef<ActivitySource>("playlist");

  // --- SHUFFLE STATE ---
  const [isShuffle, setIsShuffle] = useState(false);
  const isShuffleRef = useRef(isShuffle);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextShuffle = !prev;
      playerServiceRef.current.setShuffle(nextShuffle);
      return nextShuffle;
    });
  }, []);

  // --- REPEAT STATE ---
  const [isRepeat, setIsRepeat] = useState(false);
  const isRepeatRef = useRef(isRepeat);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  const toggleRepeat = useCallback(() => {
    setIsRepeat((prev) => !prev);
  }, []);

  const logger = useActivityLogger("playlist");

  // Kết nối Audio Engine
  const audio = useAudioEngine({
    onEndedNative: (time) => {
      logger.handleEnded();
      // NẾU BẬT REPEAT -> Tua về 0 và phát lại luôn bài hiện tại
      if (isRepeatRef.current) {
        audio.seek(0);
        audio.play();
      } else {
        nextRef.current?.(); // Nếu không thì qua bài tiếp theo
      }
    },
    onPlayNative: logger.handlePlay,
    onPauseNative: logger.handlePause,
    onTimeUpdateNative: logger.handleTimeUpdate,
    onSeekedNative: logger.handleSeek,
  });

  const loadTrack = useCallback(
    (track: Track | null, autoPlay = true, source?: ActivitySource) => {
      if (!track?.audioUrl) return;
      logger.initTrack(track.trackId, track.duration || 0, source);
      audio.load(track.audioUrl);
      setCurrentTrack(track);
      if (autoPlay) {
        setTimeout(() => audio.play(), 50);
      }
    },
    [audio, logger],
  );

  useEffect(() => {
    loadTrackRef.current = loadTrack;
  }, [loadTrack]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchDailySongs(20, page + 1);
      playerServiceRef.current.appendTracks(res.songs);
      setPage(res.page);
      if (playerServiceRef.current.getPlaylist().length >= res.total) {
        setHasMore(false);
      }
    } catch (e) {
      console.error("[PlayerContext] loadMore failed:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const next = useCallback(async () => {
    let track = playerServiceRef.current.next();
    if (!track && hasMore) {
      await loadMoreRef.current?.();
      track = playerServiceRef.current.next();
    }

    if (track) {
      if (activitySourceRef.current === "search") {
        activitySourceRef.current = "recommendation";
      }
      loadTrackRef.current?.(track, true, activitySourceRef.current);
    }
  }, [hasMore]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const prev = useCallback(() => {
    let track = playerServiceRef.current.prev();

    if (activitySourceRef.current === "search") {
      activitySourceRef.current = "recommendation";
    }

    loadTrack(track, true, activitySourceRef.current);
  }, [loadTrack]);

  useEffect(() => {
    if (playerServiceRef.current.remaining() <= 2) {
      loadMore();
    }
  }, [currentTrack, loadMore]);

  useEffect(() => {
    const raw = localStorage.getItem("player_state_v2");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (!data.playlist?.length) return;

      if (data.isShuffle !== undefined) {
        setIsShuffle(data.isShuffle);
        playerServiceRef.current.setShuffle(data.isShuffle);
      }
      if (data.isRepeat !== undefined) setIsRepeat(data.isRepeat);

      playerServiceRef.current.setPlaylist(data.playlist, data.index);
      const track = playerServiceRef.current.getCurrentTrack();

      if (track?.audioUrl) {
        logger.initTrack(track.trackId, track.duration || 0);
        audio.load(track.audioUrl);
        setTimeout(() => {
          audio.seek(data.currentTime || 0);
          if (data.isPlaying) audio.play();
        }, 200);
      }
      setCurrentTrack(track);
    } catch (e) {
      console.error("[PlayerContext] restore failed:", e);
    }
  }, []);

  // --- SYNC LOCALSTORAGE THÔNG MINH ---
  // Dùng ref để giữ state mới nhất mà không gây re-render hay reset interval
  const playerStateRef = useRef({
    playlist: [] as Track[],
    index: 0,
    currentTime: 0,
    isPlaying: false,
    isShuffle: false,
    isRepeat: false,
  });

  useEffect(() => {
    playerStateRef.current = {
      playlist: playerServiceRef.current.getPlaylist(),
      index: playerServiceRef.current.getOriginalIndex(),
      currentTime: audio.state.currentTime,
      isPlaying: audio.state.isPlaying,
      isShuffle: isShuffleRef.current,
      isRepeat: isRepeatRef.current,
    };
  }, [audio.state, isShuffle, isRepeat, currentTrack]);

  useEffect(() => {
    const saveState = () => {
      // Chỉ lưu nếu có dữ liệu để tránh lưu đè lúc mới mở trang
      if (playerStateRef.current.playlist.length > 0) {
        localStorage.setItem(
          "player_state_v2",
          JSON.stringify(playerStateRef.current),
        );
      }
    };

    // Lưu định kỳ mỗi 5 giây (giảm tải I/O so với 2 giây)
    const interval = setInterval(saveState, 5000);

    // Bắt buộc lưu ngay lập tức khi người dùng đóng trang / reload (đột ngột)
    window.addEventListener("beforeunload", saveState);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", saveState);
    };
  }, []);

  const setPlaylist = useCallback(
    (tracks: Track[], index: number, source?: ActivitySource) => {
      activitySourceRef.current = source || "playlist";
      playerServiceRef.current.setPlaylist(tracks, index);
      loadTrack(playerServiceRef.current.getCurrentTrack(), true, activitySourceRef.current);
    },
    [loadTrack],
  );

  const play = useCallback(() => audio.play(), [audio]);
  const pause = useCallback(() => audio.pause(), [audio]);
  const togglePlay = useCallback(() => {
    audio.state.isPlaying ? audio.pause() : audio.play();
  }, [audio]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying: audio.state.isPlaying,
        play,
        pause,
        togglePlay,
        setPlaylist,
        next,
        prev,
        audioState: {
          currentTime: audio.state.currentTime,
          duration: audio.state.duration,
        },
        seek: audio.seek,
        setVolume: audio.setVolume,
        isShuffle,
        toggleShuffle,
        isRepeat,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
