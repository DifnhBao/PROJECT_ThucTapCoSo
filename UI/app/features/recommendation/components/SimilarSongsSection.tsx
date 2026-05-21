"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { PiMusicNoteSimpleBold } from "react-icons/pi";

import { getSimilarSongs } from "../recommendation.api";
import type { RecommendationSong } from "../recommendation.types";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import RecommendationReason from "./RecommendationReason";
import "@/app/features/recommendation/recommendation.css";

interface Props {
  songId: number;
  limit?: number;
}

const SimilarSongsSection: React.FC<Props> = ({ songId, limit = 10 }) => {
  const [songs, setSongs] = useState<RecommendationSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setPlaylist, currentTrack, isPlaying, togglePlay } = usePlayer();

  const fetchData = useCallback(async () => {
    if (!songId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSimilarSongs(songId, limit);
      setSongs(data);
    } catch (e: any) {
      setError("Không thể tải bài hát tương tự.");
      console.error("[SimilarSongsSection]", e);
    } finally {
      setLoading(false);
    }
  }, [songId, limit]);

  // Refetch mỗi khi bài hát hiện tại đổi
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlay = (index: number) => {
    const song = songs[index];
    if (!song) return;
    if (currentTrack?.trackId === song.trackId) {
      togglePlay();
    } else {
      setPlaylist(songs, index, "recommendation");
    }
  };

  /* ---------- Không có songId ---------- */
  if (!songId) return null;

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="similar-section">
        <h3 className="similar-section-title">
          <PiMusicNoteSimpleBold className="rec-section-icon" />
          Bài hát tương tự
        </h3>
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
        <h3 className="similar-section-title">
          <PiMusicNoteSimpleBold className="rec-section-icon" />
          Bài hát tương tự
        </h3>
        <p className="rec-empty">{error}</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!songs.length) return null;

  /* ---------- Main ---------- */
  return (
    <div className="similar-section">
      <h3 className="similar-section-title">
        <PiMusicNoteSimpleBold className="rec-section-icon" />
        Bài hát tương tự
      </h3>

      <div className="similar-list">
        {songs.map((song, index) => {
          const isActive = currentTrack?.trackId === song.trackId;
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
                <RecommendationReason song={song} />
              </div>

              {/* Score badge */}
              {song.finalScore !== undefined && (
                <span className="similar-score-badge">
                  {song.finalScore > 1
                    ? `Điểm: ${song.finalScore.toFixed(2)}`
                    : `${(song.finalScore * 100).toFixed(0)}% tương đồng`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimilarSongsSection;
