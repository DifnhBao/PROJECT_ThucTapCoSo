"use client";
import Modal from "@/app/components/ui/Modal";
import { pendingViewState } from "./pending-state";
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
import ModerationConfirmation from "./ModerationConfirmation";
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

  const [confirmation, setConfirmation] = useState<{ songId: number; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const viewState = pendingViewState({ error, isLoading, hasData: !!data, count: songs.length });
  const handleApprove = (songId: number) => { setSelectedSong(null); setConfirmation({ songId, action: 'approve' }); };
  const handleReject = (songId: number) => {
    setSelectedSong(null);
    setRejectionReason("");
    setConfirmation({ songId, action: 'reject' });
  };
  const moderate = async (reason?: string) => {
    if (!confirmation || busy) return;
    setLoading(true);
    setFeedback(null);
    try {
      if (confirmation.action === 'approve') await approveSongApi(confirmation.songId);
      else await rejectSongApi(confirmation.songId, reason);
      setConfirmation(null);
      setFeedback({ error: false, message: 'Đã xử lý bài hát.' });
      await mutate();
    } catch (error: unknown) {
      setFeedback({ error: true, message: errorMessage(error, 'Không thể xử lý bài hát. Vui lòng thử lại.') });
      setConfirmation(null);
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Duyệt bài hát</h2>
      {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
      <Modal isOpen={!!confirmation} onClose={() => { if (!busy) setConfirmation(null); }}>
        {confirmation && (
          <div className={pendingStyles.confirmation}>
            <ModerationConfirmation
              action={confirmation.action}
              reason={rejectionReason}
              busy={busy}
              onReasonChange={setRejectionReason}
              onCancel={() => setConfirmation(null)}
              onConfirm={(reason) => void moderate(reason)}
              className={pendingStyles.actionGroup}
              cancelClassName={pendingStyles.viewBtn}
              confirmClassName={confirmation.action === 'approve' ? pendingStyles.approveBtn : pendingStyles.rejectBtn}
            />
          </div>
        )}
      </Modal>

      {viewState === 'error' ? <div role="alert">Không tải được danh sách.<button onClick={() => void mutate()}>Thử lại</button></div>
        : viewState === 'loading' ? <p role="status">Đang tải danh sách…</p>
        : viewState === 'empty' ? (
        <div className={pendingStyles.emptyState}>
          <span className={pendingStyles.emptyIcon}>✅</span>
          <h3>Không có bài hát nào đang chờ duyệt</h3>
          <p>Tất cả bài hát đã được xử lý.</p>
        </div>
      ) : (
        <div className={pendingStyles.tableScroll}>
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
                    "Chưa rõ"}
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
        </div>
      )}

      {viewState === 'data' && <Pagination currentPage={currentPage} totalPages={totalPages} />}

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
    <Suspense fallback={<div>Đang tải…</div>}>
      <PendingSongsContent />
    </Suspense>
  );
}
