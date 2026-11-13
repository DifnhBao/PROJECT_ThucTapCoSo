"use client";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/features/user/context/UserContext";
import { formError } from "@/app/lib/form-error";
import { useRef,useState } from "react";
import { FcPicture } from "react-icons/fc";
import { IoIosMusicalNote } from "react-icons/io";
import { uploadSongByUser } from "../song.api";
import styles from "./UploadSongModal.module.css";

export default function UploadSongModal() {
  const { closeModal } = useModal();
  const { user } = useUser();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState(user?.username ?? "");
  const [genre, setGenre] = useState("");
  const [duration, setDuration] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Tự động lấy duration khi user chọn file audio
  const handleAudioSelect = (file: File) => {
    setAudioFile(file);

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener("loadedmetadata", () => {
      setDuration(Math.round(audio.duration).toString());
      URL.revokeObjectURL(audio.src);
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError("");

    if (!title.trim()) {
      setError("Vui lòng nhập tên bài hát.");
      return;
    }

    if (!artist.trim()) {
      setError("Vui lòng nhập tên nghệ sĩ.");
      return;
    }

    if (!audioFile) {
      setError("Vui lòng chọn file nhạc.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("artist", artist.trim());
      formData.append("genre", genre.trim());
      formData.append("duration", duration || "0");
      formData.append("audioFile", audioFile);
      if (imageFile) formData.append("imageFile", imageFile);

      await uploadSongByUser(formData);

      setSuccess(true);
    } catch (err: unknown) {
      setError(formError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình thành công
  if (success) {
    return (
      <div className={styles.uploadModal}>
        <div className={styles.successState}>
          <div className={styles.successIcon}>✓</div>
          <h3>Gửi bài hát thành công!</h3>
          <p>
            Bài hát <strong>&quot;{title}&quot;</strong> đã được gửi đến quản trị viên.
            <br />
            Bài hát sẽ được hiển thị sau khi quản trị viên duyệt.
          </p>
          <button className={styles.uploadBtn} onClick={closeModal}>
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.uploadModal}>
      {/* Progress overlay */}
      {submitting && (
        <div className={styles.progressOverlay}>
          <div className={styles.spinner}></div>
          <p>Đang tải lên...</p>
        </div>
      )}

      {/* Header */}
      <div className={styles.modalHeader}>
        <div className={styles.uploadIcon}><IoIosMusicalNote /></div>
        <div className={styles.headerText}>
          <h3>Đăng bài hát</h3>
          <p>Chia sẻ âm nhạc của bạn với cộng đồng</p>
        </div>
      </div>

      {/* Title */}
      <div className={styles.formGroup}>
        <label>
          Tên bài hát <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          placeholder="Nhập tên bài hát..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Genre */}
      <div className={styles.formGroup}>
        <label>Thể loại</label>
        <input
          type="text"
          placeholder="VD: Pop, Ballad, R&B..."
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
      </div>

      {/* Artist */}
      <div className={styles.formGroup}>
        <label>
          Nghệ sĩ <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          placeholder="Tên nghệ sĩ..."
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>

      {/* Audio file + Duration row */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>
            File nhạc <span className={styles.required}>*</span>
          </label>
          <div
            className={`${styles.fileUploadArea} ${audioFile ? styles.hasFile : ""}`}
            onClick={() => audioInputRef.current?.click()}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAudioSelect(f);
              }}
            />
            {audioFile ? (
              <span className={styles.fileName}>{audioFile.name}</span>
            ) : (
              <>
                <span className={styles.fileUploadIcon}>🎧</span>
                <span className={styles.fileUploadLabel}>
                  <strong>Chọn file</strong> hoặc kéo thả
                </span>
              </>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Thời lượng (giây)</label>
          <input
            type="number"
            placeholder="Tự động"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min="0"
          />
        </div>
      </div>

      {/* Image file */}
      <div className={styles.formGroup}>
        <label>Ảnh bìa</label>
        <div
          className={`${styles.fileUploadArea} ${imageFile ? styles.hasFile : ""}`}
          onClick={() => imageInputRef.current?.click()}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setImageFile(f);
            }}
          />
          {imageFile ? (
            <span className={styles.fileName}><FcPicture /> {imageFile.name}</span>
          ) : (
            <>
              <span className={styles.fileUploadIcon}><FcPicture /></span>
              <span className={styles.fileUploadLabel}>
                <strong>Chọn ảnh bìa</strong> (tùy chọn)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Actions */}
      <div className={styles.modalActions}>
        <button
          className={styles.uploadBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Đang tải lên..." : "Đăng bài hát"}
        </button>
        <button className={styles.cancelBtn} onClick={closeModal}>
          Hủy
        </button>
      </div>
    </div>
  );
}

