"use client";
import React,{ useCallback,useRef,useState } from "react";
import { FaChevronLeft,FaChevronRight } from "react-icons/fa";
import { PiSparkle } from "react-icons/pi";
import { RiResetRightLine } from "react-icons/ri";
import useSWR from 'swr';

import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import "@/app/features/recommendation/recommendation.css";
import { getRecommendationsForUser } from "../recommendation.api";
import type { RecommendationSong } from "../recommendation.types";
import RecommendSongCard from "./RecommendSongCard";

interface Props {
  userId: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: gom nhóm theo seed song (bóc tách từ reason)               */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  DevMode Toggle Switch                                               */
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
/*  Horizontal group scroller                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  RecommendationSection                                               */
/* ------------------------------------------------------------------ */
const RecommendationSection: React.FC<Props> = ({ userId, limit = 10 }) => {
  const { data: songs = [], error: failure, isLoading: loading, mutate } = useSWR<RecommendationSong[]>(userId ? ['recommendations', userId, limit] : null, () => getRecommendationsForUser(limit));
  const error = failure ? 'Không thể tải gợi ý. Vui lòng thử lại.' : null;
  const [isDevMode, setIsDevMode] = useState(false);

  const { setPlaylist, currentTrack, isPlaying, togglePlay } = usePlayerControls();

  const gridRef = useRef<HTMLDivElement | null>(null);

  const scrollRow = (dir: "left" | "right") => {
    const el = gridRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({ 
      left: dir === "left" ? -scrollAmount : scrollAmount, 
      behavior: "smooth" 
    });
  };

  const fetchData = useCallback(async () => { await mutate(); }, [mutate]);

  const handlePlay = (index: number) => {
    const song = songs[index];
    if (!song) return;
    if (currentTrack?.trackId === song.trackId) {
      togglePlay();
    } else {
      setPlaylist(songs, index, "recommendation");
    }
  };

  /* ---------- Section Header ---------- */
  const SectionHeader = (
    <div className="rec-section-header">
      <h2 className="rec-section-title">
        <PiSparkle className="rec-section-icon" />
        Đề xuất cho bạn
      </h2>
      <div className="rec-header-actions">
        <DevModeToggle checked={isDevMode} onChange={setIsDevMode} />
        
        <div className="rec-scroll-controls" aria-label="Cuộn đề xuất">
          <button
            className="rec-scroll-btn"
            type="button"
            onClick={() => scrollRow("left")}
            title="Cuộn sang trái"
          >
            <FaChevronLeft />
          </button>
          <button
            className="rec-scroll-btn"
            type="button"
            onClick={() => scrollRow("right")}
            title="Cuộn sang phải"
          >
            <FaChevronRight />
          </button>
        </div>

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
    </div>
  );

  /* ---------- Skeleton ---------- */
  if (loading) {
    return (
      <div className="rec-section">
        {SectionHeader}
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
        {SectionHeader}
        <p className="rec-empty">{error}</p>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (!songs.length) {
    return (
      <div className="rec-section">
        {SectionHeader}
        <p className="rec-empty">
          Chưa có đề xuất. Hãy nghe thêm nhạc để hệ thống học sở thích của bạn!
        </p>
      </div>
    );
  }

  /* ---------- Main — Flat View (Cá nhân hóa tổng thể) ---------- */
  return (
    <div className="rec-section">
      {SectionHeader}

      <div className="rec-grid" ref={gridRef}>
        {songs.map((song, index) => (
          <RecommendSongCard
            key={song.trackId}
            song={song}
            isActive={currentTrack?.trackId === song.trackId}
            isPlaying={isPlaying}
            isDevMode={isDevMode}
            variant="grid"
            onClick={() => handlePlay(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default RecommendationSection;
