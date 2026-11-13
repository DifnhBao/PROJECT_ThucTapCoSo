"use client";
import Link from "next/link";
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import "@/app/features/song/components/LibraryTable/LibraryTable.css";
import type { Track } from "@/app/types/music";
import { formatDuration } from "@/app/utils/dateHelper";
import React from "react";

const LibraryTable: React.FC = () => {
  const { setPlaylist, currentTrack } = usePlayerControls();
  const { likedSongsList, likedMap, toggleLike, loading, loadingMore, hasMore, listError, loadMore, fetchLikedSongsList } = useLikeContext();

  const handlePlay = (index: number) => {
    setPlaylist(likedSongsList, index);
  };

  if (loading) return <div role="status">Đang tải thư viện…</div>;
  if (!likedSongsList.length && !listError) {
    return <div className="empty">Bạn chưa thích bài hát nào</div>;
  }

  return (
    <div id="table_row">
      {likedSongsList.map((song: Track, index: number) => {
        const isActive = currentTrack?.trackId === song.trackId;

        return (
          <div
            className={`row ${isActive ? "active" : ""}`}
            key={song.trackId}
          >
            <div className="col_index"><button aria-label={`Phát ${song.title}`} onClick={() => handlePlay(index)}>{index + 1}</button></div>

            <div className="col_title">
              <img loading="lazy" decoding="async" width={48} height={48} src={song.imageUrl} alt="" />
              <Link href={`/songs/${song.trackId}`} onClick={(event) => event.stopPropagation()}>{song.title}</Link>
            </div>

            <div className="col_artist">{song.artistName}</div>

            <div className="col_duration library-actions">{formatDuration(song.duration)}
            <button aria-label={`Bỏ yêu thích ${song.title}`} aria-pressed={likedMap[song.trackId] ?? true} onClick={(event) => { event.stopPropagation(); void toggleLike(song.trackId).catch(() => {}); }}>♥</button></div>
          </div>
        );
      })}
      {listError && <div role="alert">{listError}<button onClick={() => void fetchLikedSongsList().catch(() => {})}>Thử tải lại thư viện</button></div>}
      {hasMore && <button disabled={loadingMore || Boolean(listError)} onClick={() => void loadMore().catch(() => {})}>{loadingMore ? 'Đang tải…' : 'Tải thêm bài hát'}</button>}
    </div>
  );
};

export default LibraryTable;
