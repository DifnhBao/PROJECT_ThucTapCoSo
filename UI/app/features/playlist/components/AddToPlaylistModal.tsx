"use client";

import { useState } from "react";
import { usePlaylists } from "../hooks/usePlaylists";
import { addSongToPlaylistService } from "../service";
import { createPlaylistService } from "../service";
import CreatePlaylistModal from "./CreatePlaylistModal";
import "@/app/features/playlist/components/AddToPlaylistModal.css";

type Props = {
  trackId: number;
  trackTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function AddToPlaylistModal({
  trackId,
  trackTitle,
  onClose,
  onSuccess,
}: Props) {
  const { playlists, loading, fetchPlaylists } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null,
  );
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleAddSong = async (playlistId: number) => {
    try {
      setAdding(true);
      setError("");
      setMessage("");

      await addSongToPlaylistService(playlistId, trackId);

      setMessage(`✓ Đã thêm "${trackTitle}" vào playlist!`);
      setSelectedPlaylistId(null);

      onSuccess?.();

      // Tự động đóng sau 2 giây
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(
        err.message || "Lỗi khi thêm bài hát vào playlist. Vui lòng thử lại.",
      );
      setSelectedPlaylistId(null);
    } finally {
      setAdding(false);
    }
  };

  const handlePlaylistCreated = async () => {
    await fetchPlaylists();
    setShowCreateModal(false);
    setMessage("✓ Playlist mới đã được tạo!");
  };

  return (
    <div className="add-to-playlist-modal-overlay" onClick={onClose}>
      <div
        className="add-to-playlist-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Thêm vào Playlist</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="modal-body">
          {loading ? (
            <div className="loading">Đang tải playlists...</div>
          ) : playlists.length > 0 ? (
            <div className="playlist-list">
              {playlists.map((playlist: any) => (
                <div key={playlist.playlistId} className="playlist-item">
                  <div className="playlist-info">
                     <p className="playlist-name">{playlist.name}</p>
                    {playlist.description && (
                      <p className="playlist-description">
                        {playlist.description}
                      </p>
                    )}
                  </div>
                  <button
                    className="add-btn"
                    onClick={() => handleAddSong(playlist.playlistId)}
                    disabled={adding}
                  >
                    {adding && selectedPlaylistId === playlist.playlistId
                      ? "Đang thêm..."
                      : "Thêm"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Bạn chưa có playlist nào</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="create-new-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Tạo Playlist Mới
          </button>
        </div>

        {showCreateModal && (
          <CreatePlaylistModal
            isNested={true}
            onClose={() => setShowCreateModal(false)}
            onCreated={handlePlaylistCreated}
          />
        )}
      </div>
    </div>
  );
}
