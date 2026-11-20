import { useCallback,useEffect,useState } from 'react';
import { getAuth,subscribeAuth } from '../../../lib/auth-state';
import { ActivityDelivery } from '../activityDelivery';
import { ListeningSession,type ActivitySource } from '../listeningSession';
export type { ActivitySource } from '../listeningSession';
export function useActivityLogger(source: ActivitySource = 'playlist') {
  const [delivery] = useState(() => new ActivityDelivery());
  const [session] = useState(() => new ListeningSession((event) => { void delivery.send(event); }));
  const initTrack = useCallback((id: number, duration: number, snapshot: ActivitySource = source) => session.start(id, duration, snapshot), [session, source]);
  const stopTrack = useCallback(() => session.stop(), [session]);
  const handlePlay = useCallback((position: number) => session.play(position), [session]);
  const handlePause = useCallback((position: number) => session.suspend(position, true), [session]);
  const handleSuspend = useCallback((position: number) => session.suspend(position), [session]);
  const handleTimeUpdate = useCallback((position: number) => session.tick(position), [session]);
  const handleSeeking = useCallback(() => session.seekingStart(), [session]);
  const handleSeek = useCallback((position: number) => session.seeked(position), [session]);
  const handleDuration = useCallback((duration: number) => session.duration(duration), [session]);
  const handleEnded = useCallback((position: number) => session.finish('ended', position), [session]);
  useEffect(() => {
    let epoch = getAuth('user').epoch;
    return subscribeAuth('user', () => {
      const current = getAuth('user').epoch;
      if (current !== epoch) { epoch = current; session.discard(); delivery.clear(); }
    });
  }, [session, delivery]);
  useEffect(() => {
    const hide = () => { session.finish('tab_closed'); delivery.pagehide((url, data) => navigator.sendBeacon(url, data)); };
    window.addEventListener('pagehide', hide);
    return () => window.removeEventListener('pagehide', hide);
  }, [session, delivery]);
  return { initTrack, stopTrack, handlePlay, handlePause, handleSuspend, handleTimeUpdate, handleSeeking, handleSeek, handleDuration, handleEnded };
}
