"use client";

import { useState } from "react";
import { createPlaylistService } from "../service";
import "@/app/features/playlist/components/CreatePlaylistModal.css";

type Props = {
  onClose: () => void;
  onCreated?: () => void;
  isNested?: boolean;
};

export default function CreatePlaylistModal({
  onClose,
  onCreated,
  isNested = false,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên playlist");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createPlaylistService(name, description);

      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(
        err.message || "Lỗi khi tạo playlist. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  if (isNested) {
    // Nested modal style for use inside AddToPlaylistModal
    return (
      <div className="create-playlist-nested-overlay" onClick={onClose}>
        <div
          className="create-playlist-nested-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="nested-header">
            <h3>Tạo Playlist Mới</h3>
            <button className="nested-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="nested-form">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên playlist"
              className="input-field"
              disabled={loading}
              autoFocus
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mô tả (tùy chọn)"
              className="textarea-field"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="nested-actions">
            <button className="cancel-btn" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Đang tạo..." : "Tạo Playlist"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard modal style
  return (
    <div className="create-playlist-overlay" onClick={onClose}>
      <div
        className="create-playlist-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="header">
          <h2>Tạo Playlist Mới</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên playlist"
            className="input-field"
            disabled={loading}
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Mô tả (tùy chọn)"
            className="textarea-field"
            disabled={loading}
            rows={3}
          />
        </div>

        <div className="actions">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Đang tạo..." : "Tạo Playlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
