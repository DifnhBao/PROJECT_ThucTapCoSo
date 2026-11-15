"use client";
import type { SongDto } from '@/app/types/api';
import { formatDate,formatDuration } from "@/app/utils/dateHelper";
import { useEffect } from "react";
import styles from "./SongDetailModal.module.css";

interface Props {
  song: SongDto;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  loading: boolean;
}

export default function SongDetailModal({
  song,
  onClose,
  onApprove,
  onReject,
  loading,
}: Props) {
  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const genres =
    song.genres?.map((g) => g.name).join(", ") || "Chưa có";
  const artists =
    song.artists?.map((a) => a.name).join(", ") || "Unknown";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>Chi tiết bài hát</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Cover + basic info */}
          <div className={styles.topRow}>
            {song.image_url ? (
              <img
                src={song.image_url}
                alt={song.title}
                className={styles.cover}
              />
            ) : (
              <div className={styles.coverPlaceholder}>🎵</div>
            )}

            <div className={styles.basicInfo}>
              <h3 className={styles.songTitle}>{song.title}</h3>
              <p className={styles.artistName}>Nghệ sĩ: {artists}</p>
              <span className={styles.pendingBadge}>⏳ Chờ duyệt</span>
            </div>
          </div>

          {/* Meta grid */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Người gửi</div>
              <div className={styles.metaValue}>
                {song.uploader?.username || "—"}
              </div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Email</div>
              <div className={styles.metaValue}>
                {song.uploader?.email || "—"}
              </div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Thể loại</div>
              <div className={styles.metaValue}>{genres}</div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Thời lượng</div>
              <div className={styles.metaValue}>
                {formatDuration(song.duration)}
              </div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Ngày gửi</div>
              <div className={styles.metaValue}>
                {formatDate(song.created_at)}
              </div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Song ID</div>
              <div className={styles.metaValue}>#{song.song_id}</div>
            </div>
          </div>

          {/* Audio player */}
          <div className={styles.audioSection}>
            <div className={styles.audioLabel}>
              🎧 Nghe thử bài hát
            </div>
            <audio
              controls
              src={song.audio_url}
              className={styles.audioPlayer}
              preload="metadata"
            >
              Trình duyệt không hỗ trợ phát nhạc.
            </audio>
          </div>
        </div>

        {/* Approve / Reject actions */}
        <div className={styles.actions}>
          <button
            className={styles.approveBtn}
            onClick={() => {
              onApprove(song.song_id);
              onClose();
            }}
            disabled={loading}
          >
            ✓ Duyệt bài hát
          </button>
          <button
            className={styles.rejectBtn}
            onClick={() => {
              onReject(song.song_id);
              onClose();
            }}
            disabled={loading}
          >
            ✕ Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}
