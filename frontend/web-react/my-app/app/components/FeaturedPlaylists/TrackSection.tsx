import React from "react";
import { useState, useEffect } from "react";

import { fetchDailySongs } from "@/app/utils/songApi";
import type { Track } from "@/app/types/music";
import { usePlayer } from "@/app/context/PlayerContext";
import HorizontalScroll from "@/app/components/HorizontalScroll";

const TrackSection = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setPlaylist } = usePlayer();
  const [hasMore, setHasMore] = useState(true);

  // useEffect(() => {
  //   const loadSongs = async () => {
  //     try {
  //       const songs = await fetchDailySongs(20);
  //       setTracks(songs);
  //     } catch (error) {
  //       console.error("Fetch daily songs failed:", error);
  //     }
  //   };

  //   loadSongs();
  // }, []);

  const loadSongs = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const songs = await fetchDailySongs(20, page);

      if (songs.length === 0) {
        setHasMore(false);
        return;
      }

      setTracks((prev) => [...prev, ...songs]);
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

  if (!tracks.length) return null;

  return (
    <HorizontalScroll onReachEnd={hasMore ? loadSongs : undefined}>
      <section>
        <div className="scroll-row">
          {tracks.map((song: Track, index) => (
            <div
              key={song.trackId}
              className="card"
              onClick={() => setPlaylist(tracks, index)}
            >
              <img src={song.imageUrl} alt={song.title} />
              <h3>{song.title}</h3>
              <p>{song.artistName}</p>
            </div>
          ))}
        </div>
      </section>
    </HorizontalScroll>
  );
};

export default TrackSection;
