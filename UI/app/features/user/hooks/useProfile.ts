"use client";
import { useState } from "react";
import { useUser } from "../context/UserContext";
import { uploadAvatarService } from "../service";

export function useProfile() {
  const { refreshUser } = useUser();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await uploadAvatarService(formData);
      await refreshUser();
      return res;
    } catch (error) {
      console.error("Lỗi khi tải lên avatar:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    isUploading,
  };
}
