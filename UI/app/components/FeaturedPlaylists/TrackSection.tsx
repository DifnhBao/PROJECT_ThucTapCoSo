import { useState, useEffect } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

import { fetchDailySongs } from "@/app/features/song/song.api";
import type { Track } from "@/app/types/music";
import { usePlayer } from "@/app/features/player/context/PlayerContext";

const TrackSection = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setPlaylist, isPlaying, togglePlay, currentTrack } = usePlayer();
  const [hasMore, setHasMore] = useState(true);

  const loadSongs = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchDailySongs(20, page);
      // console.log("DEBUG FETCHED: ", res);

      const newSongs = res.songs;
      const total = res.total;

      setTracks((prev) => {
        const merged = [...prev, ...newSongs];

        const unique = Array.from(
          new Map(merged.map((s) => [s.trackId, s])).values(),
        );

        if (unique.length >= total) {
          setHasMore(false);
        }

        return unique;
      });

      setPage((p) => p + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  if (!tracks.length && loading) return <div>Loading...</div>;
  if (!tracks.length) return <div>No songs found</div>;

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
          onClick={() => {
            if (currentTrack?.trackId === song.trackId) {
              // Nếu đang là bài hiện tại → toggle play/pause
              togglePlay();
            } else {
              // Nếu là bài khác → play bài mới
              setPlaylist(tracks, index);
            }
          }}
        >
          <p>{index + 1}</p>
          <img src={song.imageUrl} alt={song.title} />

          <div className="track-info">
            <h3>{song.title}</h3>
            <p>{song.artistName}</p>
          </div>

          <div
            className="play-icon"
            onClick={(e) => {
              e.stopPropagation();

              if (currentTrack?.trackId === song.trackId) {
                togglePlay();
              } else {
                setPlaylist(tracks, index);
              }
            }}
          >
            {currentTrack?.trackId === song.trackId && isPlaying ? (
              <FaPause />
            ) : (
              <FaPlay />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackSection;
