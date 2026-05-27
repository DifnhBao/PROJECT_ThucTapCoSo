"use client";
import { useState, useEffect } from "react";
import {
  updateProfile,
  adminUpdateUserProfile,
} from "../features/user/accountApi";
import { getCurrentUserService } from "../features/user/service";
import { UserProfileData } from "../types/music";

export function useProfileForm(
  initialData?: UserProfileData,
  mode: "user" | "admin" = "user",
  userId?: number,
) {
  const [formData, setFormData] = useState<UserProfileData>({
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
  });

  const [note, setNote] = useState("*Vui lòng nhập đầy đủ thông tin");
  const [existingProfile, setExistingProfile] = useState(false);

  useEffect(() => {
    // nếu có dữ liệu ban đầu, không cần fetch
    if (initialData) {
      setFormData(initialData);
      setExistingProfile(true);
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getCurrentUserService();

        if (!data?.data) {
          setExistingProfile(false);
          return;
        }

        const profile = data.data;

        setFormData({
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          gender: profile.gender || "",
          dateOfBirth: profile.birthday || "",
          phone: profile.phone_number || "",
          address: profile.address || "",
        });

        setExistingProfile(true);
      } catch (err) {
        console.error("Fetch profile error:", err);
        setExistingProfile(false);
      }
    };
    fetchProfile();
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      phone: "",
      address: "",
    });
    setNote("*Vui lòng nhập đầy đủ thông tin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Gọi API
      let res;
      if (mode === "admin" && userId) {
        // ADMIN sửa USER
        res = await adminUpdateUserProfile(userId, formData);
      } else {
        res = await updateProfile(formData);
      }

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Có lỗi xảy ra khi gửi thông tin.");
        return;
      }

      alert(data.message || "Đã gửi thông tin thành công!");
    } catch (err: any) {
      console.error("Submit error:", err);
      alert(err?.response?.data?.message || "Có lỗi xảy ra khi gửi thông tin.");
    }
  };

  return {
    formData,
    note,
    existingProfile,
    handleChange,
    handleReset,
    handleSubmit,
  };
}
