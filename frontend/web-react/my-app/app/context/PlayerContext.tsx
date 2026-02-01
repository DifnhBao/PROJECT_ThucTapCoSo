"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Track } from "@/app/types/music";

type PlayerContextType = {
  playlist: Track[];
  setPlaylist: (pl: Track[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  isPlaying: boolean;
  currentIndex: number;
  setIndex: (i: number) => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylistState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  /* INIT AUDIO – CHỈ 1 LẦN */
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;
    (window as any)._audioRef = audioRef.current;

    const a = audioRef.current;
    const onEnded = () => {
      setCurrentIndex((idx) =>
        playlist.length ? (idx + 1) % playlist.length : 0
      );
    };

    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, []);

  /* CHỈ LOAD KHI ĐỔI BÀI */
  useEffect(() => {
    if (!audioRef.current) return;
    if (!playlist.length) return;

    const track = playlist[currentIndex];
    if (!track?.audioUrl) return;

    audioRef.current.src = track.audioUrl;
    audioRef.current.currentTime = 0;

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [playlist, currentIndex]);

  /* PLAY / PAUSE KHÔNG ĐỘNG TỚI SRC */
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const setPlaylist = (pl: Track[], startIndex = 0) => {
    setPlaylistState(pl);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
  };

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  const togglePlay = () => setIsPlaying((p) => !p);

  return (
    <PlayerContext.Provider
      value={{
        playlist,
        setPlaylist,
        play,
        pause,
        togglePlay,
        isPlaying,
        currentIndex,
        setIndex: setCurrentIndex,
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
