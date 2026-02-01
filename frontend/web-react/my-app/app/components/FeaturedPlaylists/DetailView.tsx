"use client";

import React from "react";
import { useEffect } from "react";
import type { DetailViewData } from "@/app/types/music";
import { usePlayer } from "@/app/context/PlayerContext";
import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";
import { formatDuration } from "@/app/utils/dateHelper";

interface Props {
  data: DetailViewData;
  onBack: () => void;
}

const DetailView: React.FC<Props> = ({ data, onBack }) => {
  const { playlist, setPlaylist, currentIndex, setIndex } = usePlayer();

  const tracks = data.tracks;
  const title = data.title;
  const cover = data.coverImages;

  const handlePlaySong = (index: number) => {
    if (tracks.length === 0) return;

    setPlaylist(tracks, index);
  };
  

  return (
    <div
      className="playlist-detail"
      // style={{ backgroundImage: `url(${cover})` }}
    >
      {/* BACKGROUND */}
      <div className="playlist-bg">
        <PlaylistCover images={cover ?? []} size={800} />
        <div className="playlist-bg-overlay" />
      </div>

      <button onClick={onBack} className="back-button">
        ← Back
      </button>

      <div className="overlay" />

      <div className="playlist-header">
        <div className="playlist-info">
          <PlaylistCover images={cover ?? []} size={200} />

          <div className="playlist-content">
            <div className="playlist-type">
              {data.type === "playlist"
                ? `Playlist · ${tracks.length} bài hát`
                : `Artist · ${tracks.length} bài hát`}
            </div>

            <h1 className="playlist-title">{title}</h1>

            {/* {isPlaylist && ( */}
            {/* <div className="playlist-artists">{title}</div> */}
            {/* )} */}

            <div className="playlist-actions">
              <div className="playlist-icons">
                <span className="icon">❤️</span>
                <span className="count">999</span>
                <span className="icon">↗</span>
                <span className="count">0</span>
                <span className="icon more">⋯</span>
              </div>

              <button
                className="play-playlists"
                onClick={() => {
                  setPlaylist(tracks);
                  setIndex(0);
                }}
              >
                ▶ Phát tất cả
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-view">
        <div className="table">
          <div className="table_header">
            <div className="col_index">#</div>
            <div className="col_title">Title</div>
            <div className="col_artist">Artist</div>
            <div className="col_duration">Duration</div>
          </div>

          {tracks.map((song, index) => {
            const isActive = playlist[currentIndex]?.trackId === song.trackId;

            return (
              <div
                key={song.trackId}
                className={`row song-item ${isActive ? "active" : ""}`}
                onClick={() => handlePlaySong(index)}
              >
                <div className="col_index">{index + 1}</div>

                <div className="col_title">
                  <img src={song.imageUrl} alt={song.title} />
                  <span>{song.title}</span>
                </div>

                <div className="col_artist">{song.artistName}</div>
                <div className="col_duration">
                  {formatDuration(song.duration)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DetailView;
