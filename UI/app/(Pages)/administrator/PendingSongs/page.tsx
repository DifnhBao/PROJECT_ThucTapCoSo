"use client";
import Pagination from "@/app/components/ui/Pagination";
import {
approveSongApi,
fetchPendingSongs,
rejectSongApi,
} from "@/app/features/song/song.api";
import { errorMessage } from "@/app/lib/error-message";
import { useAuthState } from '@/app/lib/use-auth-state';
import styles from "@/app/styles/AdminPage/ManageSong.module.css";
import type { SongDto,SongPageDto } from '@/app/types/api';
import { formatDate,formatDuration } from "@/app/utils/dateHelper";
import { useSearchParams } from "next/navigation";
import { Suspense,useState } from "react";
import useSWR from 'swr';
import pendingStyles from "./PendingSongs.module.css";
import SongDetailModal from "./SongDetailModal";

function PendingSongsContent() {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const auth = useAuthState('admin');
  const { data, error, isLoading, mutate } = useSWR<SongPageDto>(auth.principal ? ['pending-songs', auth.principal.userId, auth.epoch, currentPage] : null, () => fetchPendingSongs({ page: currentPage, limit: 20 }));
  const songs = data?.data ?? [], totalPages = data?.pagination.totalPages ?? 1;
  const [busy, setLoading] = useState(false);
  const loading = isLoading || busy;
  const [selectedSong, setSelectedSong] = useState<SongDto | null>(null);

  const handleApprove = async (songId: number) => {
    if (!confirm("Bạn có chắc muốn duyệt bài hát này?")) return;
    try {
      setLoading(true);
      await approveSongApi(songId);
      await mutate();
      if (selectedSong?.song_id === songId) setSelectedSong(null);
    } catch (error: unknown) {
      alert(errorMessage(error, "Duyệt thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (songId: number) => {
    if (!confirm("Bạn có chắc muốn từ chối bài hát này?")) return;
    try {
      setLoading(true);
      await rejectSongApi(songId);
      await mutate();
      if (selectedSong?.song_id === songId) setSelectedSong(null);
    } catch (error: unknown) {
      alert(errorMessage(error, "Từ chối thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Duyệt bài hát</h2>
      {error && <div role="alert">Không tải được danh sách.<button onClick={() => void mutate()}>Thử lại</button></div>}

      {songs.length === 0 && !loading ? (
        <div className={pendingStyles.emptyState}>
          <span className={pendingStyles.emptyIcon}>✅</span>
          <h3>Không có bài hát nào đang chờ duyệt</h3>
          <p>Tất cả bài hát đã được xử lý.</p>
        </div>
      ) : (
        <table className={styles.songTable}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tên bài hát</th>
              <th>Nghệ sĩ</th>
              <th>Người gửi</th>
              <th>Thể loại</th>
              <th>Ngày gửi</th>
              <th>Thời lượng</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {songs.map((song) => (
              <tr key={song.song_id}>
                <td>
                  <div className={pendingStyles.songTitle}>
                    {song.image_url && (
                      <img
                        src={song.image_url}
                        alt=""
                        className={pendingStyles.songThumb}
                      />
                    )}
                    <span>{song.title}</span>
                  </div>
                </td>
                <td>
                  {song.artists?.map((a) => a.name).join(", ") ||
                    "Unknown"}
                </td>
                <td>
                  <span className={pendingStyles.uploaderName}>
                    {song.uploader?.username || "—"}
                  </span>
                </td>
                <td>{song.genres?.map((g) => g.name).join(", ") || "—"}</td>
                <td>{formatDate(song.created_at)}</td>
                <td>{formatDuration(song.duration)}</td>
                <td>
                  <div className={pendingStyles.actionGroup}>
                    <button
                      className={pendingStyles.viewBtn}
                      onClick={() => setSelectedSong(song)}
                    >
                      👁 Xem
                    </button>
                    <button
                      className={pendingStyles.approveBtn}
                      onClick={() => handleApprove(song.song_id)}
                      disabled={loading}
                    >
                      ✓ Duyệt
                    </button>
                    <button
                      className={pendingStyles.rejectBtn}
                      onClick={() => handleReject(song.song_id)}
                      disabled={loading}
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} />

      {selectedSong && (
        <SongDetailModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={loading}
        />
      )}
    </div>
  );
}

export default function PendingSongsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PendingSongsContent />
    </Suspense>
  );
}
