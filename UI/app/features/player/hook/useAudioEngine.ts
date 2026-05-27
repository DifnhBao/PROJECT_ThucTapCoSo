import { useEffect, useRef, useState, useCallback } from "react";

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface AudioEngineOptions {
  onEndedNative?: (currentTime: number) => void;
  onPlayNative?: (currentTime: number) => void;
  onPauseNative?: (currentTime: number) => void;
  onTimeUpdateNative?: (currentTime: number) => void;
  onSeekedNative?: (currentTime: number) => void;
}

export function useAudioEngine(options: AudioEngineOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lưu trữ options vào ref để tránh stale closure mà không cần re-bind event
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useState<AudioEngineState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.5;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: isNaN(audio.duration) ? 0 : audio.duration,
      }));
      // Bắn trực tiếp Native Event ra ngoài
      optionsRef.current.onTimeUpdateNative?.(audio.currentTime);
    };

    const onPlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
      optionsRef.current.onPlayNative?.(audio.currentTime);
    };

    const onPause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      optionsRef.current.onPauseNative?.(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: isNaN(audio.duration) ? 0 : audio.duration,
      }));
    };

    const onEnded = () => {
      optionsRef.current.onEndedNative?.(audio.currentTime);
    };

    const onSeeked = () => {
      optionsRef.current.onSeekedNative?.(audio.currentTime);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("seeked", onSeeked);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("seeked", onSeeked);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const load = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = url;
    audio.load();
  }, []);

  const play = useCallback(async () => {
    try {
      await audioRef.current?.play();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AudioEngine] play() blocked:", err);
      }
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // Hàm audio.currentTime = x sẽ trigger sự kiện "seeked" ở trên
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  return { audioRef, state, load, play, pause, seek, setVolume };
}
