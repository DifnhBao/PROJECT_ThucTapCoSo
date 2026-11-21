"use client";
import type { RecentSong } from '../recent.api';
type Props = {
  items?: RecentSong[]; hasError: boolean; onRetry: () => void;
  hasMore: boolean; loadingMore: boolean; pageError: boolean;
  onLoadMore: () => void; onPlay: (index: number) => void;
};
export default function RecentlyPlayed({ items, hasError, onRetry, hasMore, loadingMore, pageError, onLoadMore, onPlay }: Props) {
  return <section aria-labelledby="recent-title" className="song-submissions recent-history">
    <h2 id="recent-title">Nghe gần đây</h2>
    {hasError ? <div role="alert">Không tải được lịch sử nghe. <button type="button" onClick={onRetry}>Thử lại</button></div>
      : !items ? <p role="status">Đang tải lịch sử nghe...</p>
      : items.length === 0 ? <p>Bạn chưa nghe bài hát nào.</p>
      : <><ul>{items.map((song, index) => <li key={song.song_id}>
        <button type="button" onClick={() => onPlay(index)} aria-label={`Phát ${song.title}`}>{song.title}</button>
        <span> — {song.artists?.map((artist) => artist.name).join(', ') || 'Chưa rõ nghệ sĩ'}</span>
        <time dateTime={song.lastPlayedAt}> · {new Date(song.lastPlayedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
      </li>)}</ul>
        {pageError && <p role="alert">Không tải được trang tiếp theo. Vui lòng thử lại.</p>}
        {hasMore && <button type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? 'Đang tải thêm...' : pageError ? 'Thử tải thêm' : 'Tải thêm'}</button>}
      </>}
  </section>;
}
