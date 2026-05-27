"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { RiResetRightLine } from "react-icons/ri";
import { PiSparkle } from "react-icons/pi";

import { getRecommendationsForUser } from "../recommendation.api";
import type { RecommendationSong } from "../recommendation.types";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import RecommendationReason from "./RecommendationReason";
import "@/app/features/recommendation/recommendation.css";

interface Props {
  userId: number;
  limit?: number;
}

const RecommendationSection: React.FC<Props> = ({ userId, limit = 10 }) => {
  const [songs, setSongs] = useState<RecommendationSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setPlaylist, currentTrack, isPlaying, togglePlay } = usePlayer();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecommendationsForUser(userId, limit);
      setSongs(data);
    } catch (e: unknown) {
      setError("Không thể tải gợi ý. Vui lòng thử lại.");
      console.error("[RecommendationSection]", e);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  const handlePlay = (index: number) => {
    const song = songs[index];
    if (!song) return;

    if (currentTrack?.trackId === song.trackId) {
      togglePlay();
    } else {
      // Truyền source "recommendation" để activity logger ghi đúng
      setPlaylist(songs, index, "recommendation");
    }
  };

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="rec-section">
        <div className="rec-section-header">
          <h2 className="rec-section-title">
            <PiSparkle className="rec-section-icon" />
            Đề xuất cho bạn
          </h2>
        </div>
        <div className="rec-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rec-card rec-card--skeleton">
              <div className="rec-card-img-skeleton" />
              <div className="rec-card-body">
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
      <div className="rec-section">
        <div className="rec-section-header">
          <h2 className="rec-section-title">
            <PiSparkle className="rec-section-icon" />
            Đề xuất cho bạn
          </h2>
        </div>
        <p className="rec-empty">{error}</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!songs.length) {
    return (
      <div className="rec-section">
        <div className="rec-section-header">
          <h2 className="rec-section-title">
            <PiSparkle className="rec-section-icon" />
            Đề xuất cho bạn
          </h2>
        </div>
        <p className="rec-empty">
          Chưa có đề xuất. Hãy nghe thêm nhạc để hệ thống học sở thích của bạn!
        </p>
      </div>
    );
  }

  /* ---------- Main ---------- */
  return (
    <div className="rec-section">
      <div className="rec-section-header">
        <h2 className="rec-section-title">
          <PiSparkle className="rec-section-icon" />
          Đề xuất cho bạn
        </h2>
        <button
          id="refresh-rec-for-you"
          className="rec-refresh-btn"
          onClick={fetchData}
          title="Làm mới"
        >
          <RiResetRightLine />
          Làm mới
        </button>
      </div>

      <div className="rec-grid">
        {songs.map((song, index) => {
          const isActive = currentTrack?.trackId === song.trackId;
          return (
            <div
              key={song.trackId}
              className={`rec-card${isActive ? " rec-card--active" : ""}`}
              onClick={() => handlePlay(index)}
              title={song.title}
            >
              {/* Cover art */}
              <div className="rec-card-img-wrap">
                {song.imageUrl ? (
                  <img
                    src={song.imageUrl}
                    alt={song.title}
                    className="rec-card-img"
                  />
                ) : (
                  <div className="rec-card-img-placeholder">🎵</div>
                )}
                <div className="rec-card-overlay">
                  {isActive && isPlaying ? <FaPause /> : <FaPlay />}
                </div>
              </div>

              {/* Info */}
              <div className="rec-card-body">
                <h3 className="rec-card-title">{song.title}</h3>
                <p className="rec-card-artist">{song.artistName}</p>

                {/* Final score badge */}
                {song.finalScore !== undefined && (
                  <span className="rec-score-badge">
                    Điểm đề xuất: {song.finalScore.toFixed(2)}
                  </span>
                )}

                <RecommendationReason song={song} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationSection;
