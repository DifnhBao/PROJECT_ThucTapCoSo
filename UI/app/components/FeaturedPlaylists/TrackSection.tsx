"use client";
import Link from "next/link";
import { useCallback,useEffect,useRef,useState } from "react";
import { FaPause,FaPlay } from "react-icons/fa";

import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import { fetchDailySongs } from "@/app/features/song/song.api";
import type { Track } from "@/app/types/music";

const TrackSection = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setPlaylist, isPlaying, togglePlay, currentTrack } = usePlayerControls();
  const [hasMore, setHasMore] = useState(true);

  const flightRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const pageRef = useRef(1);
  const moreRef = useRef(true);
  const failedRef = useRef(false);
  const tracksRef = useRef<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const loadSongs = useCallback(async (retry = false) => {
    if (flightRef.current || !moreRef.current || (failedRef.current && !retry)) return;
    const controller = new AbortController(), generation = generationRef.current, requested = pageRef.current;
    flightRef.current = controller; failedRef.current = false; setLoading(true); setError(null);
    try {
      const res = await fetchDailySongs(20, requested, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
      if (generation !== generationRef.current) return;
      if (res.page !== requested) throw new Error('Invalid catalog cursor');
      const merged = Array.from(new Map([...tracksRef.current, ...res.songs].map((song) => [song.trackId, song])).values());
      moreRef.current = res.songs.length > 0 && merged.length > tracksRef.current.length && merged.length < res.total;
      tracksRef.current = merged; pageRef.current = requested + 1;
      setTracks(merged); setPage(pageRef.current); setHasMore(moreRef.current);
    } catch {
      if (generation !== generationRef.current) return;
      failedRef.current = true; setError('Không tải được danh sách bài hát. Vui lòng thử lại.');
    } finally {
      if (flightRef.current === controller) { flightRef.current = null; setLoading(false); }
    }
  }, []);
  useEffect(() => {
    const generation = ++generationRef.current;
    let active = true;
    queueMicrotask(() => { if (active) void loadSongs(); });
    return () => { active = false; generationRef.current = generation + 1; flightRef.current?.abort(); flightRef.current = null; };
  }, [loadSongs]);
  if (!tracks.length && error) return <div role="alert">{error}<button onClick={() => void loadSongs(true)}>Thử tải danh sách</button></div>;
  if (!tracks.length && loading) return <div>Đang tải bài hát…</div>;
  if (!tracks.length) return <div>Chưa có bài hát</div>;

  return (
    <div
      className="list-container"
      onScroll={(e) => {
        const target = e.currentTarget;

        if (
          target.scrollTop + target.clientHeight >=
          target.scrollHeight - 100
        ) {
          loadSongs();
        }
      }}
    >
      {tracks.map((song: Track, index) => (
        <div
          key={song.trackId}
          className={`list-item ${currentTrack?.trackId === song.trackId ? "playing" : ""}`}

        >
          <p>{index + 1}</p>
          <img loading="lazy" decoding="async" width={80} height={80} src={song.imageUrl} alt={song.title} />

          <div className="track-info">
            <h3><Link href={`/songs/${song.trackId}`} onClick={(event) => event.stopPropagation()}>{song.title}</Link></h3>
            <p>{song.artistName}</p>
          </div>

          <button
            aria-label={`Phát ${song.title}`}
            className="play-icon"
            onClick={(e) => {
              e.stopPropagation();

              if (currentTrack?.trackId === song.trackId) {
                togglePlay();
              } else {
                setPlaylist(tracks, index, "radio", { nextPage: page, hasMore, pageSize: 20 });
              }
            }}
          >
            {currentTrack?.trackId === song.trackId && isPlaying ? (
              <FaPause />
            ) : (
              <FaPlay />
            )}
          </button>
        </div>
      ))}
      {error && <div role="alert">{error}<button onClick={() => void loadSongs(true)}>Thử tải danh sách</button></div>}
      {loading && <div role="status">Đang tải bài hát…</div>}
    </div>
  );
};

export default TrackSection;
