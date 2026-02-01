import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { changePassword } from "../utils/accountApi";
import { validatePassword } from "@/app/utils/passwordValidator";
import "@/app/styles/AdminPage/addAdmin.css";

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPW, setConfirmPW] = useState("");
  const { openModal } = useModal();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPW) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    const passwordError = validatePassword(confirmPW);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    try {
      const res = await changePassword(oldPassword, confirmPW);
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error("Lỗi khi gọi api changPassword.");
    }
  };

  return (
    <div className="container">
      <h1>Change your password</h1>
      <form onSubmit={handleChangePassword}>
        {/* <label htmlFor="password" className="form_label">
          Old Password
        </label> */}
        <input
          id="old-password"
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />

        {/* <label htmlFor="password" className="form_label">
          New Password
        </label> */}
        <input
          id="new-password"
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {/* <label htmlFor="confirm_password" className="form_label">
          Password Confirmation
        </label> */}
        <input
          id="confirm_password"
          type="password"
          placeholder="Password Confirmation"
          value={confirmPW}
          onChange={(e) => setConfirmPW(e.target.value)}
          required
        />
        <button type="submit">Change</button>
      </form>
    </div>
  );
}
