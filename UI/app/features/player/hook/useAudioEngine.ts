import { useCallback,useEffect,useRef,useState } from 'react';
import { AudioController,initialAudioState,type AudioEngineOptions } from '../audioController';
export type { AudioEngineOptions,AudioEngineState } from '../audioController';

export function useAudioEngine(options: AudioEngineOptions = {}) {
  const optionsRef = useRef(options);
  const controllerRef = useRef<AudioController | null>(null);
  const [state, setState] = useState(initialAudioState);
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => {
    const controller = new AudioController(() => new Audio(), setState, () => optionsRef.current);
    controllerRef.current = controller;
    return () => { controller.dispose(); controllerRef.current = null; };
  }, []);
  const load = useCallback((url: string | null, startTime = 0) => { controllerRef.current?.load(url, startTime); }, []);
  const play = useCallback(async () => { await controllerRef.current?.play(); }, []);
  const pause = useCallback(() => { controllerRef.current?.pause(); }, []);
  const seek = useCallback((time: number) => { controllerRef.current?.seek(time); }, []);
  const setVolume = useCallback((volume: number) => { controllerRef.current?.setVolume(volume); }, []);
  return { state, load, play, pause, seek, setVolume };
}
