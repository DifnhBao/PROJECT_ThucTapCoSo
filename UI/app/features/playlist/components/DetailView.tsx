"use client";
import Link from "next/link";
import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";
import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import type { DetailViewData } from "@/app/types/music";
import { formatDuration } from "@/app/utils/dateHelper";
import React,{ useEffect,useRef } from "react";
import { FaPause,FaPlay } from "react-icons/fa";
import { IoTrashOutline } from "react-icons/io5";
import { MdArrowBackIosNew } from "react-icons/md";
import styles from "./DetailView.module.css";

interface Props {
  data: DetailViewData;
  onBack: () => void;
  onRemoveSong?: (songId: number) => void;
  onDeletePlaylist?: () => void;
}

const DetailView: React.FC<Props> = ({ data, onBack, onRemoveSong, onDeletePlaylist }) => {
  const { currentTrack, setPlaylist, isPlaying, togglePlay } = usePlayerControls();
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

      <button aria-label="Quay lại" onClick={onBack} className={styles.backButton}>
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
              >
                <div className={styles.colIndex}><button aria-label={`Phát ${song.title}`} onClick={() => handlePlaySong(index)}>{index + 1}</button></div>

                <div className={styles.colTitle}>
                  <img loading="lazy" decoding="async" width={48} height={48} src={song.imageUrl} alt={song.title} />
                  <Link href={`/songs/${song.trackId}`} onClick={(e) => e.stopPropagation()}>{song.title}</Link>
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
