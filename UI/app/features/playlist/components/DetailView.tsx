"use client";

import React, { useEffect, useRef } from "react";
import type { DetailViewData } from "@/app/types/music";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";
import { formatDuration } from "@/app/utils/dateHelper";
import styles from "./DetailView.module.css";
import { MdArrowBackIosNew } from "react-icons/md";
import { IoShareOutline, IoTrashOutline } from "react-icons/io5";
import { IoHeart } from "react-icons/io5";
import { FaPlay } from "react-icons/fa";
import { FaPause } from "react-icons/fa";

interface Props {
  data: DetailViewData;
  onBack: () => void;
  onRemoveSong?: (songId: number) => void;
  onDeletePlaylist?: () => void;
}

const DetailView: React.FC<Props> = ({ data, onBack, onRemoveSong, onDeletePlaylist }) => {
  const { currentTrack, setPlaylist, isPlaying, togglePlay } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Khi component mount, lập tức cuộn container về đầu trang
    containerRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  const isCurrentPlaylistActive = currentTrack && data.tracks.some(t => t.trackId === currentTrack.trackId);

  const tracks = data.tracks;
  const title = data.title;
  const cover = data.coverImages;

  const handlePlaySong = (index: number) => {
    if (tracks.length === 0) return;

    setPlaylist(tracks, index);
  };

  return (
    <div ref={containerRef} className={styles.playlistDetail}>
      {/* BACKGROUND */}
      <div className={styles.playlistBg}>
        <PlaylistCover images={cover ?? []} size={800} />
        <div className={styles.playlistBgOverlay} />
      </div>

      <button onClick={onBack} className={styles.backButton}>
        <MdArrowBackIosNew />
      </button>

      <div className={styles.playlistHeader}>
        <div className={styles.playlistInfo}>
          <PlaylistCover images={cover ?? []} size={200} />

          <div className={styles.playlistContent}>
            <div className={styles.playlistType}>
              {data.type === "playlist"
                ? `Playlist · ${tracks.length} bài hát`
                : `Artist · ${tracks.length} bài hát`}
            </div>

            <h1 className={styles.playlistTitle}>{title}</h1>

            <div className={styles.playlistActions}>
              <div className={styles.playlistIcons}>
                <IoHeart className={styles.icon} />
                <span className={styles.count}>999K</span>
                <IoShareOutline className={styles.icon}/>
                <span className={styles.count}>0</span>
                {onDeletePlaylist && data.type === "playlist" && (
                  <button
                    onClick={onDeletePlaylist}
                    title="Xóa playlist"
                    style={{
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      marginLeft: "10px"
                    }}
                  >
                    <IoTrashOutline className={styles.icon} style={{ color: "#ff4b4b" }} />
                  </button>
                )}
                <span className={`${styles.icon} ${styles.more}`}>⋯</span>
              </div>

              <button
                className={styles.playPlaylists}
                onClick={() => {
                  if (tracks.length === 0) return;
                  if (isCurrentPlaylistActive) {
                    togglePlay();
                  } else {
                    setPlaylist(tracks, 0);
                  }
                }}
              >
                {isCurrentPlaylistActive && isPlaying ? (
                  <>
                    <FaPause /> Tạm dừng
                  </>
                ) : (
                  <>
                    <FaPlay /> Phát tất cả
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.detailView}>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.colIndex}>#</div>
            <div className={styles.colTitle}>Title</div>
            <div className={styles.colArtist}>Artist</div>
            <div className={styles.colDuration}>Duration</div>
            <div className={styles.colAction}></div>
          </div>

          {tracks.map((song, index) => {
            const isActive = currentTrack?.trackId === song.trackId;

            return (
              <div
                key={song.trackId}
                className={`${styles.row} ${isActive ? styles.activeRow : ""}`}
                onClick={() => handlePlaySong(index)}
              >
                <div className={styles.colIndex}>{index + 1}</div>

                <div className={styles.colTitle}>
                  <img src={song.imageUrl} alt={song.title} />
                  <span>{song.title}</span>
                </div>

                <div className={styles.colArtist}>{song.artistName}</div>
                <div className={styles.colDuration}>
                  {formatDuration(song.duration)}
                </div>
                <div className={styles.colAction}>
                  {onRemoveSong && (
                    <button
                      className={styles.removeBtn}
                      title="Xóa bài hát"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSong(song.trackId);
                      }}
                    >
                      <IoTrashOutline />
                    </button>
                  )}
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
