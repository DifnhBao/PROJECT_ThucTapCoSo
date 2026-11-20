"use client";
import { errorMessage } from "@/app/lib/error-message";
import { useAuthState } from '@/app/lib/use-auth-state';
import type { SongDto,SongMetadata,SongPageDto } from '@/app/types/api';
import { useSearchParams } from "next/navigation";
import { Suspense,useEffect,useState } from "react";
import useSWR from 'swr';

import Pagination from "@/app/components/ui/Pagination";
import { useModal } from "@/app/context/ModalContext";
import {
createSong,
deleteSong,
fetchSongsForManage,
toggleSongVisibility,
updateSong,
} from "@/app/features/song/song.api";
import styles from "@/app/styles/AdminPage/ManageSong.module.css";
import { formatDate,formatDuration } from "@/app/utils/dateHelper";

function SongManagement() {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const { openModal } = useModal();
  const [busy, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const auth = useAuthState('admin');
  const { data, error, isLoading, mutate } = useSWR<SongPageDto>(auth.principal ? ['managed-songs', auth.principal.userId, auth.epoch, currentPage, debouncedSearch] : null, () => fetchSongsForManage({ page: currentPage, limit: 20, search: debouncedSearch }));
  const songs = data?.data ?? [], totalPages = data?.pagination.totalPages ?? 1, loading = isLoading || busy;

  const openAddModal = () => {
    openModal("song-form", {
      song: null,
      onSave: async (formData: SongMetadata | FormData) => {
        if (!(formData instanceof FormData)) throw new Error("Thêm bài hát cần file upload.");
        try {
          const res = await createSong(formData);

          alert(res.message || "Thêm bài hát thành công!");

          await mutate();
        } catch (error: unknown) {
          alert(errorMessage(error, "Thêm bài hát thất bại"));
          throw error;
        }
      },
    });
  };

  const openEditModal = (song: SongDto) => {
    openModal("song-form", {
      song,
      onSave: async (updatedData: SongMetadata | FormData) => {
        if (updatedData instanceof FormData) throw new Error("Chỉnh sửa chỉ nhận metadata.");
        await updateSong(song.song_id, updatedData);

        await mutate();
      },
    });
  };

  const handleDelete = async (songId: number) => {
    if (!confirm("Bạn có chắc muốn xoá bài hát này?")) return;

    try {
      setLoading(true);

      await deleteSong(songId);

      // Cập nhật lại UI
      await mutate();
    } catch (error: unknown) {
      alert(errorMessage(error, "Xóa bài hát thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (songId: number) => {
    console.log("Toggling visibility for song ID:", songId);
    try {
      setLoading(true);

      await toggleSongVisibility(songId);

      await mutate();
    } catch (error: unknown) {
      alert(errorMessage(error, "Không thể thay đổi trạng thái bài hát"));
    } finally {
      setLoading(false);
    }
  };
  console.log("songs: ", songs);

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Song Management</h2>
      {error && <div role="alert">Không tải được danh sách.<button onClick={() => void mutate()}>Thử lại</button></div>}

      <div className={styles.topBar}>
        <button className={styles.addButton} onClick={openAddModal}>
          + Add New Song
        </button>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search songs by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className={styles.songTable}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Genre</th>
            <th>View</th>
            <th>updated date</th>
            <th>Duration</th>
            <th>Hide</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {songs.map((song) => (
            <tr key={song.song_id}>
              <td>{song.title}</td>
              <td>
                {song.artists?.map((a) => a.name).join(", ") || "Unknown"}
              </td>
              <td>{song.genre}</td>
              <td>{song.view_count}</td>
              <td>{formatDate(song.fetched_at)}</td>
              <td>{formatDuration(song.duration)}</td>
              <td>
                <button
                  className={` ${
                    song.is_visible ? styles.visibilityBtn : styles.hidden
                  }`}
                  onClick={() => handleToggleVisibility(song.song_id)}
                  disabled={loading}
                >
                  {song.is_visible ? "Hidden" : "Visible"}
                </button>
              </td>
              <td>
                <button
                  className={styles.editBtn}
                  onClick={() => openEditModal(song)}
                >
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(song.song_id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

export default function SongManagementPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SongManagement />
    </Suspense>
  );
}
