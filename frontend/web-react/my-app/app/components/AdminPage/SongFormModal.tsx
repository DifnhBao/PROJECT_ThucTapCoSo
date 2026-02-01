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

  useEffect(() => {
    if (song) {
      setTitle(song.title ?? "");
      setArtist(song.artist_name ?? "");
      setGenre(song.genre ?? "");
    }
  }, [song]);

  const handleSubmit = async () => {
    if (!title) {
      alert("Thiếu title");
      return;
    }

    // ADD → FormData (có file)
    if (!isEdit) {
      if (!audioFile) {
        alert("Phải chọn file nhạc");
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("genre", genre);
      formData.append("audioFile", audioFile);

      await onSave(formData);
    }

    // EDIT → JSON (không file)
    else {
      await onSave({
        title,
        artist,
        genre,
      });
    }
    closeModal();
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
        placeholder="Artist"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
      />

      <input
        type="text"
        placeholder="Genre"
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

      <div className={styles.modalActions}>
        <button className={styles.saveBtn} onClick={handleSubmit}>
          Save
        </button>
        <button className={styles.cancelBtn} onClick={closeModal}>
          Cancel
        </button>
      </div>
    </div>
  );
}
