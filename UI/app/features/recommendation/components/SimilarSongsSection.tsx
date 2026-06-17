"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { PiMusicNoteSimpleBold } from "react-icons/pi";

import { getSimilarSongs } from "../recommendation.api";
import type { RecommendationSong } from "../recommendation.types";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import RecommendSongCard from "./RecommendSongCard";
import "@/app/features/recommendation/recommendation.css";

interface Props {
  songId: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  DevMode Toggle (inline, tái sử dụng nhỏ)                           */
/* ------------------------------------------------------------------ */
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}
const DevModeToggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <label className="dev-toggle" title="Chế độ Giảng viên: Hiển thị thông số AI">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ display: "none" }}
    />
    <span className={`dev-toggle-track${checked ? " dev-toggle-track--on" : ""}`}>
      <span className="dev-toggle-thumb" />
    </span>
    <span className="dev-toggle-label">
      {checked ? "🤖 Thông số AI" : "🎧 Thông số AI"}
    </span>
  </label>
);

/* ------------------------------------------------------------------ */
/*  SimilarSongsSection                                                 */
/* ------------------------------------------------------------------ */
const SimilarSongsSection: React.FC<Props> = ({ songId, limit = 10 }) => {
  const [songs, setSongs] = useState<RecommendationSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
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

  const scrollList = (direction: "left" | "right") => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction === "left" ? -list.clientWidth * 0.85 : list.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  /* ---------- Section Header ---------- */
  const SectionHeader = (
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
      <div className="similar-header-right">
        {songId && <DevModeToggle checked={isDevMode} onChange={setIsDevMode} />}
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
    </div>
  );

  /* ---------- Không có songId ---------- */
  if (!songId) {
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
        </div>
        <p className="rec-empty">Chọn một bài hát để xem các bài tương tự.</p>
      </div>
    );
  }

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="similar-section">
        {SectionHeader}
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
        {SectionHeader}
        <p className="rec-empty">{error}</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!songs.length) return null;

  /* ---------- Main ---------- */
  return (
    <div className="similar-section">
      {SectionHeader}

      {/* SỬA 1: Dùng chung class rec-grid để cuộn ngang mượt mà giống hệt phần dưới */ }
      <div className="rec-grid" ref={listRef}>
        {songs.map((song, index) => (
          <RecommendSongCard
            key={song.trackId}
            song={song}
            isActive={currentTrack?.trackId === song.trackId}
            isPlaying={isPlaying}
            isDevMode={isDevMode}
            variant="grid" // <--- SỬA 2: Đổi thành thẻ vuông (grid)
            onClick={() => handlePlay(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default SimilarSongsSection;
