"use client";

import { useState, useEffect } from "react";
import { User, UserProfileData } from "../types/music";
import { getUserProfile } from "../utils/accountApi";
import Profile from "./Profile";

export default function EditUserProfile({ userData }: { userData: User }) {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userData?.userId) return;

      setLoading(true);

      const res = await getUserProfile(userData.userId);
      if (!res.ok) {
        setFormData(null);
        setLoading(false);
        return;
      }

      const result = await res.json();
      const u = result.data;

      if (!u) {
        setFormData(null);
      } else {
        // CHỈ set formData khi THỰC SỰ có dữ liệu
        const hasAnyProfileData =
          u.first_name ||
          u.last_name ||
          u.gender ||
          u.birthday ||
          u.phone_number ||
          u.address;

        if (!hasAnyProfileData) {
          setFormData(null);
        } else {
          setFormData({
            firstName: u.first_name ?? "",
            lastName: u.last_name ?? "",
            gender: u.gender ?? "",
            dateOfBirth: u.birthday ?? "",
            phone: u.phone_number ?? "",
            address: u.address ?? "",
          });
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userData]);

  if (loading) return null;

  if (!formData) {
    return (
      <div
        style={{
          width: "420px",
          height: "120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#fff",
          color: "black",
          borderRadius: "10px",
          padding: "0 30px",
          fontWeight: "600",
        }}
      >
        Người dùng chưa cập nhật thông tin cá nhân.
      </div>
    );
  }

  return (
    <Profile initialData={formData} mode="admin" userId={userData.userId} />
  );
}
