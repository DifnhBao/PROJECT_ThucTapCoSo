"use client";
import { useEffect,useRef,useState } from "react";
import {
adminUpdateUserProfile,
updateProfile,
} from "../features/user/accountApi";
import { getCurrentUserService } from "../features/user/service";
import { readApiResponse } from "../lib/api-contract";
import { formError } from '../lib/form-error';
import { UserProfileData } from "../types/music";

export function useProfileForm(
  initialData?: UserProfileData,
  mode: "user" | "admin" = "user",
  userId?: number,
) {
  const dirty = useRef(false);
  const [formData, setFormData] = useState<UserProfileData>(initialData ?? {
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("*Vui lòng nhập đầy đủ thông tin");
  const [existingProfile, setExistingProfile] = useState(Boolean(initialData));

  useEffect(() => {
    if (initialData) return;
    let active = true;
    const fetchProfile = async () => {
      try {
        const data = await getCurrentUserService();
        if (!active || dirty.current) return;

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
        if (!active) return;
        setNote(formError(err));
        setExistingProfile(false);
      }
    };
    void fetchProfile();
    return () => { active = false; };
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    dirty.current = true;
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
    if (submitting) return;
    setSubmitting(true);

    try {
      // Gọi API
      let res;
      if (mode === "admin" && userId) {
        // ADMIN sửa USER
        res = await adminUpdateUserProfile(userId, formData);
      } else {
        res = await updateProfile(formData);
      }

      const data = await readApiResponse<{ message?: string }>(res);

      if (!res.ok) {
        alert(data.message || "Có lỗi xảy ra khi gửi thông tin.");
        return;
      }

      alert(data.message || "Đã gửi thông tin thành công!");
    } catch (err: unknown) {
      console.error("Submit error:", err);
      setNote(formError(err));
    } finally { setSubmitting(false); }
  };

  return {
    submitting,
    formData,
    note,
    existingProfile,
    handleChange,
    handleReset,
    handleSubmit,
  };
}
