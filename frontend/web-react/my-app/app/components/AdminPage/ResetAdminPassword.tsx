"use client";

import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { changeAdminPassword } from "@/app/utils/accountApi";
import { User } from "@/app/types/music";
import { validatePassword } from "@/app/utils/passwordValidator";
import "@/app/styles/AdminPage/addAdmin.css";

export default function ResetAdminPassword({ admin }: { admin: User }) {
  const { closeModal } = useModal();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPW, setConfirmPW] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPW) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    try {
      setLoading(true);
      const res = await changeAdminPassword(admin.userId, newPassword);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      alert("Đặt lại mật khẩu thành công");
      closeModal();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Reset mật khẩu</h1>

      <p className="name">
        Admin: <strong>{admin.username}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Mật khẩu mới"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirmPW}
          onChange={(e) => setConfirmPW(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        </button>
      </form>
    </div>
  );
}
