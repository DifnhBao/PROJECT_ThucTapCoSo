"use client";

import { useState, useRef, useEffect } from "react";
import Profile from "@/app/features/user/components/Profile";
import styles from "./ProfilePage.module.css";
import { useUser } from "@/app/features/user/context/UserContext";
import { useProfile } from "@/app/features/user/hooks/useProfile";

export default function ProfilePage() {
  const { user } = useUser();
  const { uploadAvatar, isUploading } = useProfile();

  // State lưu URL ảnh preview tạm thời
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Ref để kết nối với thẻ input file bị ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dọn dẹp URL Object khi component unmount để tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Kích hoạt input file ẩn khi bấm vào nút máy ảnh
  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  // Xử lý khi người dùng chọn file xong
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Tạo URL tạm để hiển thị preview ngay lập tức
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // 2. Sử dụng hook để upload
      try {
        await uploadAvatar(file);
        // Thành công: Xóa preview khi đã có ảnh thật từ DB (hook đã gọi refreshUser)
        setPreviewUrl(null);
      } catch (error) {
        // Thất bại: Trả lại trạng thái cũ
        setPreviewUrl(null);
      }
    }
  };

  // Logic hiển thị Avatar: Ưu tiên ảnh Preview -> Ảnh User từ DB -> Ảnh mặc định
  // Lưu ý: Sửa lại user?.avatar theo đúng key trong database của bạn nhé
  const displayAvatar =
    previewUrl || user?.avatar || "/images/Avatar/avt01.png";

  return (
    <div className={styles.pageContainer}>
      <div className={styles.heroSection}>
        <div className={styles.coverPhoto}></div>

        <div className={styles.userInfo}>
          <div className={styles.avatarWrapper}>
            <img
              src={displayAvatar}
              alt="User Avatar"
              className={styles.largeAvatar}
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            <button
              className={styles.editAvatarBtn}
              onClick={handleEditClick}
              title="Thay đổi ảnh đại diện"
              type="button"
            >
              {/* Icon Camera SVG */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
          </div>

          <h2 className={styles.displayName}>
            {user?.username || "Người dùng"}
          </h2>
          <span className={styles.premiumBadge}>
            <svg viewBox="0 0 576 512" height="1em">
              <path
                className={styles.logoIcon}
                d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"
              ></path>
            </svg>
            Premium Member
          </span>
        </div>
      </div>

      <div className={styles.formContainer}>
        <Profile />
      </div>
    </div>
  );
}
