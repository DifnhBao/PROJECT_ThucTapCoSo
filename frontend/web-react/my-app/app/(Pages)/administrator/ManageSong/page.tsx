"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import styles from "@/app/styles/AdminPage/ManageSong.module.css";
import { useModal } from "@/app/context/ModalContext";
import {
  fetchSongsForManage,
  updateSong,
  deleteSong,
  toggleSongVisibility,
  createSong,
} from "@/app/utils/songApi";
import Pagination from "@/app/components/Pagination";
import { formatDuration, formatDate } from "@/app/utils/dateHelper";

function SongManagement() {
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const { openModal } = useModal();
  const [songs, setSongs] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const res = await fetchSongsForManage({
          page: currentPage,
          limit: 20,
          search: "",
        });

        setSongs(res.data);
        setTotalPages(res.pagination.totalPages);
      } catch (error) {
        console.error("Fetch songs failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage]);

  const openAddModal = () => {
    openModal("song-form", {
      song: null,
      onSave: async (formData: FormData) => {
        try {
          const res = await createSong(formData);

          alert(res.message || "Thêm bài hát thành công!");

          setSongs((prev) => [res.data, ...prev]);
        } catch (error: any) {
          alert(error.message || "Thêm bài hát thất bại");
          throw error; 
        }
      },
    });
  };

  const openEditModal = (song: any) => {
    openModal("song-form", {
      song,
      onSave: async (updatedData: any) => {
        const res = await updateSong(song.song_id, updatedData);

        setSongs((prev) =>
          prev.map((s) => (s.song_id === song.song_id ? res.data : s))
        );
      },
    });
  };

  const handleDelete = async (songId: number) => {
    if (!confirm("Bạn có chắc muốn xoá bài hát này?")) return;

    try {
      setLoading(true);

      await deleteSong(songId);

      // Cập nhật lại UI
      setSongs((prev) => prev.filter((s) => s.song_id !== songId));
    } catch (error: any) {
      alert(error.message || "Xóa bài hát thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (songId: number) => {
    console.log("Toggling visibility for song ID:", songId);
    try {
      setLoading(true);

      const res = await toggleSongVisibility(songId);

      setSongs((prev) =>
        prev.map((s) =>
          s.song_id === songId ? { ...s, is_visible: res.isVisible } : s
        )
      );
    } catch (error: any) {
      alert(error.message || "Không thể thay đổi trạng thái bài hát");
    } finally {
      setLoading(false);
    }
  };
  console.log('songs: ', songs)

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Song Management</h2>

      <button className={styles.addButton} onClick={openAddModal}>
        + Add New Song
      </button>

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
              <td>{song?.artists?.name}</td>
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
