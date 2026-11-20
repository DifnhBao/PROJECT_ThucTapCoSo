"use client";
import { formError } from '@/app/lib/form-error';
import { useModal } from "@/app/context/ModalContext";
import styles from "@/app/styles/AdminPage/ManageSong.module.css";
import { useState } from "react";
import type { SongSave } from '../../../context/ModalContext';
import type { SongDto } from '../../../types/api';

export default function SongFormModal({
  song,
  onSave,
}: {
  song: SongDto | null;
  onSave: SongSave;
}) {
  const { closeModal } = useModal();
  const isEdit = Boolean(song);

  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artists?.map((artist) => artist.name).join(", ") ?? "");
  const [genre, setGenre] = useState(song?.genres?.map((genre) => genre.name).join(", ") ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(song?.duration?.toString() ?? "");

  const [saveError, setSaveError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    if (!title) {
      alert("Thiếu title");
      return;
    }

    // ADD → FormData (có file)
    try {
      setSubmitting(true);
      setSaveError("");

      if (!isEdit) {
        if (!audioFile) {
          alert("Phải chọn file nhạc");
          return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("artist", artist);
        formData.append("genre", genre);
        if (duration.trim()) formData.append("duration", duration);
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
      setSaveError(formError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modal}>
      {saveError && <p role="alert">{saveError}</p>}
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
