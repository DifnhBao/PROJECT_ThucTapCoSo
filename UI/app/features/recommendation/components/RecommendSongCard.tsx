"use client";

import React, { useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import type { RecommendationSong } from "../recommendation.types";

/* ------------------------------------------------------------------ */
/*  Helper: bóc tách reason → 1-2 Visual Tags                          */
/* ------------------------------------------------------------------ */
type TagDef = { emoji: string; label: string; keywords: string[] };

// const TAG_DEFINITIONS: TagDef[] = [
//   { emoji: "🎤", label: "Cùng ca sĩ",  keywords: ["cùng nghệ sĩ", "cùng ca sĩ", "same artist", "cùng tác giả"] },
//   { emoji: "🔥", label: "Sôi động",    keywords: ["sôi động", "năng lượng", "energetic", "upbeat", "dance"] },
//   { emoji: "🥰", label: "Thư giãn",    keywords: ["thư giãn", "nhẹ nhàng", "chill", "relax", "acoustic"] },
//   { emoji: "🎸", label: "Cùng thể loại", keywords: ["cùng thể loại", "thể loại", "genre", "same genre"] },
//   { emoji: "💫", label: "Phổ biến",    keywords: ["phổ biến", "trending", "nổi tiếng", "popular"] },
//   { emoji: "🎵", label: "Âm điệu tương tự", keywords: ["âm điệu", "melody", "tương tự âm", "similar sound"] },
//   { emoji: "❤️", label: "Bạn yêu thích", keywords: ["yêu thích", "favorite", "liked", "đã thích"] },
//   { emoji: "🌙", label: "Tâm trạng",   keywords: ["tâm trạng", "mood", "buồn", "sad", "ballad"] },
// ];

const TAG_DEFINITIONS: TagDef[] = [
  { emoji: "🎤", label: "Cùng nghệ sĩ", keywords: ["cùng do", "thể hiện", "nghệ sĩ"] },
  { emoji: "🔥", label: "Sôi động",    keywords: ["tràn đầy năng lượng", "sôi động", "bùng nổ", "bắt tai"] },
  { emoji: "🥰", label: "Thư giãn",    keywords: ["nhẹ nhàng", "thư giãn", "chữa lành", "bình yên"] },
  { emoji: "💖", label: "Lãng mạn",    keywords: ["lãng mạn", "ngọt ngào", "mộng mơ"] },
  { emoji: "🌧️", label: "Tâm trạng",   keywords: ["buồn bã", "u buồn", "suy tư", "tự sự", "tan vỡ"] },
  { emoji: "✨", label: "Tươi vui",    keywords: ["tươi vui", "nhí nhảnh", "dễ thương"] },
  { emoji: "🏷️", label: "Cùng chủ đề", keywords: ["xoay quanh chủ đề", "đồng điệu về phong cách"] },
  { emoji: "✍️", label: "Ca từ đồng điệu", keywords: ["ca từ đồng điệu"] },
  { emoji: "👥", label: "Gu cộng đồng", keywords: ["cùng gu âm nhạc", "nhiều người"] },
];

function extractTags(reason?: string): TagDef[] {
  if (!reason) return [];
  const lowerReason = reason.toLowerCase();
  const matched = TAG_DEFINITIONS.filter((tag) =>
    tag.keywords.some((kw) => lowerReason.includes(kw))
  );
  return matched.slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Helper: bóc tách scores từ detail object                           */
/* ------------------------------------------------------------------ */
interface ScoreBar { label: string; value: number; color: string }

function extractScoreBars(song: RecommendationSong): ScoreBar[] {
  const bars: ScoreBar[] = [];

  if (song.metadataScore !== undefined) {
    bars.push({ label: "Metadata", value: Math.min(song.metadataScore, 1), color: "#a78bfa" });
  }
  if (song.behavioralScore !== undefined) {
    bars.push({ label: "Behavioral", value: Math.min(song.behavioralScore, 1), color: "#34d399" });
  }
  if (song.finalScore !== undefined) {
    bars.push({ label: "Final Score", value: Math.min(song.finalScore, 1), color: "var(--tt-orange)" });
  }

  // Bóc detail nếu có
  if (song.detail && typeof song.detail === "object") {
    const detail = song.detail as Record<string, unknown>;
    const extraKeys = ["content_score", "collab_score", "hybrid_score", "interaction_score"];
    const labelMap: Record<string, string> = {
      content_score: "Content",
      collab_score: "Collab",
      hybrid_score: "Hybrid",
      interaction_score: "Interaction",
    };
    const colors = ["#60a5fa", "#f472b6", "#fbbf24", "#4ade80"];
    let ci = 0;
    for (const key of extraKeys) {
      if (typeof detail[key] === "number" && !bars.find((b) => b.label === labelMap[key])) {
        bars.push({ label: labelMap[key], value: Math.min(detail[key] as number, 1), color: colors[ci % colors.length] });
        ci++;
      }
    }
  }

  return bars;
}

/* ------------------------------------------------------------------ */
/*  RecommendSongCard — Card component chung                           */
/* ------------------------------------------------------------------ */
interface CardProps {
  song: RecommendationSong;
  isActive: boolean;
  isPlaying: boolean;
  isDevMode: boolean;
  variant?: "grid" | "list"; // grid = dạng dọc (RecommendationSection), list = dạng ngang (SimilarSongsSection)
  onClick: () => void;
}

const RecommendSongCard: React.FC<CardProps> = ({
  song,
  isActive,
  isPlaying,
  isDevMode,
  variant = "grid",
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const tags = extractTags(song.reason);
  const scoreBars = extractScoreBars(song);

  const showPopover = isDevMode && hovered;

  if (variant === "list") {
    /* ---- LIST variant (SimilarSongsSection) ---- */
    return (
      <div
        className={`similar-item${isActive ? " similar-item--active" : ""}`}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={song.title}
        style={{ position: "relative" }}
      >
        {/* Thumbnail */}
        <div className="similar-img-wrap">
          {song.imageUrl ? (
            <img src={song.imageUrl} alt={song.title} className="similar-img" />
          ) : (
            <div className="similar-img-placeholder">🎵</div>
          )}
          <div className="similar-play-overlay">
            {isActive && isPlaying ? <FaPause /> : <FaPlay />}
          </div>

          {/* Visual tags trên ảnh (user mode) */}
          {!isDevMode && tags.length > 0 && (
            <div className="rec-tags-on-img">
              {tags.map((t) => (
                <span key={t.label} className="rec-tag rec-tag--img">
                  {t.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="similar-info">
          <span className="similar-title">{song.title}</span>
          <span className="similar-artist">{song.artistName}</span>

          {/* Visual tags dưới artist (user mode) */}
          {!isDevMode && tags.length > 0 && (
            <div className="rec-tags-row">
              {tags.map((t) => (
                <span key={t.label} className="rec-tag">
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>
          )}

          {/* Dev mode: icon indicator */}
          {isDevMode && (
            <span className="rec-dev-icon" title="Xem thông số AI">🤖</span>
          )}
        </div>

        {/* Dev mode Popover */}
        {showPopover && (
          <AiPopover song={song} scoreBars={scoreBars} />
        )}
      </div>
    );
  }

  /* ---- GRID variant (RecommendationSection) ---- */
  return (
    <div
      className={`rec-card${isActive ? " rec-card--active" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={song.title}
      style={{ position: "relative" }}
    >
      {/* Cover art */}
      <div className="rec-card-img-wrap">
        {song.imageUrl ? (
          <img src={song.imageUrl} alt={song.title} className="rec-card-img" />
        ) : (
          <div className="rec-card-img-placeholder">🎵</div>
        )}
        <div className="rec-card-overlay">
          {isActive && isPlaying ? <FaPause /> : <FaPlay />}
        </div>

        {/* Visual tags trên góc ảnh */}
        {!isDevMode && tags.length > 0 && (
          <div className="rec-tags-on-img">
            {tags.map((t) => (
              <span key={t.label} className="rec-tag rec-tag--img">
                {t.emoji}
              </span>
            ))}
          </div>
        )}

        {/* Dev mode badge */}
        {isDevMode && (
          <div className="rec-dev-badge">🤖</div>
        )}
      </div>

      {/* Info */}
      <div className="rec-card-body">
        <h3 className="rec-card-title">{song.title}</h3>
        <p className="rec-card-artist">{song.artistName}</p>

        {/* Visual tags dưới artist (user mode) */}
        {!isDevMode && tags.length > 0 && (
          <div className="rec-tags-row">
            {tags.map((t) => (
              <span key={t.label} className="rec-tag">
                {t.emoji} {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dev mode Popover */}
      {showPopover && (
        <AiPopover song={song} scoreBars={scoreBars} />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* AiPopover — Hover overlay trong Dev Mode                            */
/* ------------------------------------------------------------------ */
interface PopoverProps {
  song: RecommendationSong;
  scoreBars: ScoreBar[];
}

const AiPopover: React.FC<PopoverProps> = ({ song, scoreBars }) => {
  // Bao quát cả 2 API (Similar dùng finalScore, User Rec dùng accumulatedScore)
  const mainScore = song.finalScore ?? (song as any).accumulatedScore ?? (song as any).accumulated_score;

  return (
    // Xóa onClick={(e) => e.stopPropagation()} để khi click vào Popover vẫn phát nhạc được
    <div className="ai-popover">
      <div className="ai-popover-header">
        <span>🤖 Explainable AI</span>
      </div>

      {/* Điểm tổng hợp */}
      {mainScore !== undefined && (
        <div className="ai-popover-row">
          <span className="ai-popover-label">Điểm tổng hợp</span>
          <span className="ai-popover-value ai-popover-value--highlight">
            {Number(mainScore).toFixed(4)}
          </span>
        </div>
      )}

      {/* Progress bars */}
      {scoreBars.length > 0 && (
        <div className="ai-popover-bars">
          {scoreBars.map((bar) => (
            <div key={bar.label} className="ai-bar-row">
              <span className="ai-bar-label">{bar.label}</span>
              <div className="ai-bar-track">
                <div
                  className="ai-bar-fill"
                  style={{
                    width: `${Math.min(bar.value * 100, 100).toFixed(1)}%`,
                    background: bar.color,
                  }}
                />
              </div>
              <span className="ai-bar-num">{bar.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lý do nguyên văn */}
      {song.reason && (
        <div className="ai-popover-reason">
          <span className="ai-popover-label">Lý do đề xuất:</span>
          <p className="ai-popover-reason-text">{song.reason}</p>
        </div>
      )}
    </div>
  );
};

export default RecommendSongCard;
