"use client";

import React, { useEffect } from "react";
import "@/app/features/song/components/LibraryTable/LibraryTable.css";
import { formatDuration } from "@/app/utils/dateHelper";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import type { Track } from "@/app/types/music";

const LibraryTable: React.FC = () => {
  const { setPlaylist, currentTrack } = usePlayer();
  const { likedSongsList, fetchLikedSongsList } = useLikeContext();

  useEffect(() => {
    fetchLikedSongsList();
  }, [fetchLikedSongsList]);

  const handlePlay = (index: number) => {
    setPlaylist(likedSongsList, index);
  };

  if (!likedSongsList.length) {
    return <div className="empty">Bạn chưa thích bài hát nào</div>;
  }

  return (
    <div id="table_row">
      {likedSongsList.map((song: Track, index: number) => {
        const isActive = currentTrack?.trackId === song.trackId;

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
