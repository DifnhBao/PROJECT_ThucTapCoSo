"use client";

import React, { useState, useEffect } from "react";
import "@/app/styles/library.css";
import { fetchLikedSongs } from "@/app/utils/songApi";
import { formatDuration } from "@/app/utils/dateHelper";
import type { Track } from "@/app/types/music";
import { usePlayer } from "@/app/context/PlayerContext";

const LibraryTable: React.FC = () => {
  const [songs, setSongs] = useState<Track[]>([]);
  const { setPlaylist, playlist, currentIndex } = usePlayer();

  useEffect(() => {
    fetchLikedSongs().then(setSongs).catch(console.error);
  }, []);

  const handlePlay = (index: number) => {
    setPlaylist(songs, index);
  };

  return (
    <div id="table_row">
      {songs.map((song, index) => {
        const isActive = playlist[currentIndex]?.trackId === song.trackId;

        return (
          <div
            className={`row ${isActive ? "active" : ""}`}
            key={song.trackId}
            onClick={() => handlePlay(index)}
          >
            <div className="col_index">{index + 1}</div>
            <div className="col_title">
              <img src={song.imageUrl} />
              <span>{song.title}</span>
            </div>
            <div className="col_artist">{song.artistName}</div>
            <div className="col_duration">{formatDuration(song.duration)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default LibraryTable;
