"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaPlay, FaPause, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { PiMusicNoteSimpleBold } from "react-icons/pi";

import { getSimilarSongs } from "../recommendation.api";
import type { RecommendationSong } from "../recommendation.types";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import "@/app/features/recommendation/recommendation.css";

interface Props {
  songId: number;
  limit?: number;
}

const SimilarSongsSection: React.FC<Props> = ({ songId, limit = 10 }) => {
  const [songs, setSongs] = useState<RecommendationSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { setPlaylist, currentTrack, isPlaying, togglePlay } = usePlayer();

  const fetchData = useCallback(async () => {
    if (!songId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSimilarSongs(songId, limit);
      setSongs(data);
    } catch (e: unknown) {
      setError("Không thể tải bài hát tương tự.");
      console.error("[SimilarSongsSection]", e);
    } finally {
      setLoading(false);
    }
  }, [songId, limit]);

  // Refetch mỗi khi bài hát hiện tại đổi
  useEffect(() => {
    if (!songId) {
      setSongs([]);
      setError(null);
      setLoading(false);
      return;
    }

    fetchData();
  }, [songId, fetchData]);

  const handlePlay = (index: number) => {
    const song = songs[index];
    if (!song) return;
    if (currentTrack?.trackId === song.trackId) {
      togglePlay();
    } else {
      setPlaylist(songs, index, "recommendation");
    }
  };

  const getSimilarityLabel = (score?: number) => {
    if (score === undefined) return null;
    const percent =
      score >= 0 && score <= 1 ? score * 100 : Math.min(score, 100);
    return `Độ tương đồng: ${percent.toFixed(0)}%`;
  };

  const scrollList = (direction: "left" | "right") => {
    const list = listRef.current;
    if (!list) return;

    list.scrollBy({
      left:
        direction === "left"
          ? -list.clientWidth * 0.85
          : list.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  /* ---------- Không có songId ---------- */
  if (!songId) {
    return (
      <div className="similar-section">
        <div className="similar-section-header">
          <h3 className="similar-section-title">
            <PiMusicNoteSimpleBold className="rec-section-icon" />
            Bài hát tương tự
          </h3>
          <p className="similar-section-subtitle">
            {currentTrack?.title
              ? `Dựa trên bài đang phát: ${currentTrack.title}`
              : "Dựa trên bài đang phát"}
          </p>
        </div>
        <p className="rec-empty">Chọn một bài hát để xem các bài tương tự.</p>
      </div>
    );
  }

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="similar-section">
        <div className="similar-section-header">
          <h2 className="similar-section-title">
            <PiMusicNoteSimpleBold className="rec-section-icon" />
            Bài hát tương tự
          </h2>
          <p className="similar-section-subtitle">
            {currentTrack?.title
              ? `Dựa trên bài đang phát: ${currentTrack.title}`
              : "Dựa trên bài đang phát"}
          </p>
        </div>
        <div className="similar-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="similar-item similar-item--skeleton">
              <div className="similar-img-skeleton" />
              <div className="similar-info">
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="similar-section">
        <div className="similar-section-header">
          <h3 className="similar-section-title">
            <PiMusicNoteSimpleBold className="rec-section-icon" />
            Bài hát tương tự
          </h3>
          <p className="similar-section-subtitle">
            {currentTrack?.title
              ? `Dựa trên bài đang phát: ${currentTrack.title}`
              : "Dựa trên bài đang phát"}
          </p>
        </div>
        <p className="rec-empty">{error}</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!songs.length) return null;

  /* ---------- Main ---------- */
  return (
    <div className="similar-section">
      <div className="similar-section-header">
        <div>
          <h3 className="similar-section-title">
            <PiMusicNoteSimpleBold className="rec-section-icon" />
            Bài hát tương tự
          </h3>
          <p className="similar-section-subtitle">
            {currentTrack?.title
              ? `Dựa trên bài đang phát: ${currentTrack.title}`
              : "Dựa trên bài đang phát"}
          </p>
        </div>
        <div className="rec-scroll-controls" aria-label="Cuộn bài hát tương tự">
          <button
            className="rec-scroll-btn"
            type="button"
            onClick={() => scrollList("left")}
            title="Cuộn sang trái"
          >
            <FaChevronLeft />
          </button>
          <button
            className="rec-scroll-btn"
            type="button"
            onClick={() => scrollList("right")}
            title="Cuộn sang phải"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="similar-list" ref={listRef}>
        {songs.map((song, index) => {
          const isActive = currentTrack?.trackId === song.trackId;
          const similarityLabel = getSimilarityLabel(song.finalScore);
          return (
            <div
              key={song.trackId}
              className={`similar-item${isActive ? " similar-item--active" : ""}`}
              onClick={() => handlePlay(index)}
              title={song.title}
            >
              {/* Thumbnail */}
              <div className="similar-img-wrap">
                {song.imageUrl ? (
                  <img
                    src={song.imageUrl}
                    alt={song.title}
                    className="similar-img"
                  />
                ) : (
                  <div className="similar-img-placeholder">🎵</div>
                )}
                <div className="similar-play-overlay">
                  {isActive && isPlaying ? <FaPause /> : <FaPlay />}
                </div>
              </div>

              {/* Info */}
              <div className="similar-info">
                <span className="similar-title">{song.title}</span>
                <span className="similar-artist">{song.artistName}</span>
                {song.reason && (
                  <span className="similar-reason">{song.reason}</span>
                )}
                {similarityLabel && (
                  <span className="similar-score-badge">
                    {similarityLabel}
                  </span>
                )}
              </div>

              {/* <button
                className="similar-play-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePlay(index);
                }}
                title={isActive && isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isActive && isPlaying ? <FaPause /> : <FaPlay />}
              </button> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimilarSongsSection;
