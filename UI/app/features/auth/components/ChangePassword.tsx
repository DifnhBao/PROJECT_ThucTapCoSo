import { useState } from "react";
import styles from "@/app/styles/form.module.css";
import { useModal } from "@/app/context/ModalContext";
import { changePassword } from "../../user/accountApi";
import { validatePassword } from "@/app/utils/passwordValidator";

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
    <div className={styles.formContainer}>
      <h1 className={styles.title}>Change your password</h1>

      <form onSubmit={handleChangePassword}>
        <input
          type="password"
          placeholder="Old Password"
          className={styles.input}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password"
          className={styles.input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password Confirmation"
          className={styles.input}
          value={confirmPW}
          onChange={(e) => setConfirmPW(e.target.value)}
        />

        <button className={styles.button}>Change</button>
      </form>
    </div>
  );
}
