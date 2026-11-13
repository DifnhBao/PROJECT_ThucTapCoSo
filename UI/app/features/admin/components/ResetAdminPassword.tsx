"use client";
import { useModal } from "@/app/context/ModalContext";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { changeAdminPassword,changeOwnAdminPassword } from "@/app/features/user/accountApi";
import "@/app/styles/AdminPage/addAdmin.css";
import { User } from "@/app/types/music";
import { validatePassword } from "@/app/utils/passwordValidator";
import { useState } from "react";
import { readApiResponse } from "../../../lib/api-contract";

export default function ResetAdminPassword({ admin }: { admin: User }) {
  const { closeModal } = useModal();
  const { admin: actor } = useAdminUser();
  const isSelf = actor?.userId === admin.userId;
  const [oldPassword, setOldPassword] = useState("");
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
      const res = isSelf
        ? await changeOwnAdminPassword(oldPassword, newPassword)
        : await changeAdminPassword(admin.userId, newPassword);
      const data = await readApiResponse<{ message?: string }>(res);

      if (!res.ok) throw new Error(data.message);

      alert("Đặt lại mật khẩu thành công");
      closeModal();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>{isSelf ? "Đổi mật khẩu" : "Reset mật khẩu"}</h1>

      <p className="name">
        Admin: <strong>{admin.username}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        {isSelf && (
          <input type="password" placeholder="Mật khẩu hiện tại"
            aria-label="Mật khẩu hiện tại" autoComplete="current-password"
            value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
        )}
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
