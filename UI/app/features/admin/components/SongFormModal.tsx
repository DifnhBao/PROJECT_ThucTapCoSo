"use client";
import { useState, useEffect } from "react";
import styles from "@/app/styles/AdminPage/ManageSong.module.css";
import { useModal } from "@/app/context/ModalContext";

export default function SongFormModal({
  song,
  onSave,
}: {
  song: any | null;
  onSave: (data: any) => Promise<void>;
}) {
  const { closeModal } = useModal();
  const isEdit = Boolean(song);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [duration, setDuration] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (song) {
      setTitle(song.title ?? "");
      
      // Chuyển mảng artists thành chuỗi ngăn cách bởi dấu phẩy
      const artistStr = song.artists?.map((a: any) => a.name).join(", ") || "";
      setArtist(artistStr);

      // Chuyển mảng genres thành chuỗi ngăn cách bởi dấu phẩy
      const genreStr = song.genres?.map((g: any) => g.name).join(", ") || "";
      setGenre(genreStr);
      
      setDuration(song.duration?.toString() ?? "");
    }
  }, [song]);

  const handleSubmit = async () => {
    if (submitting) return;

    if (!title) {
      alert("Thiếu title");
      return;
    }

    // ADD → FormData (có file)
    try {
      setSubmitting(true);

      if (!isEdit) {
        if (!audioFile) {
          alert("Phải chọn file nhạc");
          return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("artist", artist);
        formData.append("genre", genre);
        formData.append("duration", duration);
        formData.append("audioFile", audioFile);
        if (imageFile) formData.append("imageFile", imageFile);

        await onSave(formData);
      }
      // EDIT → JSON (không file)
      else {
        await onSave({
          title,
          artist,
          genre,
          duration: parseInt(duration) || 0,
        });
      }
      closeModal();
    } catch (err) {
      console.error("Save song failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modal}>
      <h3>{isEdit ? "Edit Song" : "Add New Song"}</h3>

      <input
        type="text"
        placeholder="Song Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        type="text"
        placeholder="Artists (e.g. artist1, artist2, artist3)"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
      />

      <input
        type="text"
        placeholder="Genres (e.g. Pop, Rock, EDM)"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
      />

      {!isEdit && (
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => e.target.files && setAudioFile(e.target.files[0])}
        />
      )}

      <input
        type="number"
        placeholder="Duration (seconds)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
      />

      <div className={styles.modalActions}>
        <button
          className={styles.saveBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Uploading..." : "Save"}
        </button>
        <button className={styles.cancelBtn} onClick={closeModal}>
          Cancel
        </button>
      </div>
    </div>
  );
}
