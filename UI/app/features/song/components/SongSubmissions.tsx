import type { SongSubmissionDto } from "@/app/types/api";
import { formatDate, formatDuration } from "@/app/utils/dateHelper";

const statusLabel = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export default function SongSubmissions({
  submissions,
  hasError,
  onRetry,
  onUpload,
}: {
  submissions?: SongSubmissionDto[];
  hasError: boolean;
  onRetry: () => void;
  onUpload: () => void;
}) {
  return (
    <section className="song-submissions" aria-labelledby="song-submissions-title">
      <h2 id="song-submissions-title">Bài tôi đã gửi</h2>
      {hasError ? (
        <div>
          <p role="alert">Không tải được danh sách bài đã gửi.</p>
          <button type="button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : !submissions ? (
        <p role="status">Đang tải bài đã gửi…</p>
      ) : submissions.length === 0 ? (
        <div>
          <p>Bạn chưa gửi bài hát nào.</p>
          <button type="button" onClick={onUpload}>Gửi bài hát</button>
        </div>
      ) : (
        <ul className="song-submissions-list">
          {submissions.map((song) => (
            <li key={song.song_id} className="song-submissions-row">
              <div className="song-submissions-track">
                <strong>{song.title}</strong>
                <p>{[
                  song.artists.map(({ name }) => name).join(", "),
                  song.genres.map(({ name }) => name).join(", "),
                  song.duration != null && formatDuration(song.duration),
                ].filter(Boolean).join(" · ")}</p>
                <p>Ngày gửi {formatDate(song.created_at)}</p>
                {song.status === "rejected" && song.rejection_reason && (
                  <p className="song-submissions-reason">Lý do từ chối: {song.rejection_reason}</p>
                )}
              </div>
              <span className="song-submissions-badge" data-status={song.status}>
                {statusLabel[song.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
