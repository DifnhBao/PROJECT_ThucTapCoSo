"use client";
import { useModal } from "@/app/context/ModalContext";
import { addNewAdmin } from "@/app/features/auth/authApi";
import styles from "@/app/styles/form.module.css";
import { validatePassword } from "@/app/utils/passwordValidator";
import { useState } from "react";
import { readApiResponse } from "../../../lib/api-contract";

export default function AddNewAdmin({ onCreated }: { onCreated?: () => Promise<unknown> }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { closeModal } = useModal();

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      alert(passwordError);
      return;
    }

    try {
      // Gửi dữ liệu này đến backend
      const res = await addNewAdmin(username, email, password);
      const data = await readApiResponse<{ message?: string }>(res);

      alert(data.message);

      if (res.ok) {
        await onCreated?.().catch(() => {});
        closeModal();
      }
    } catch (error) {
      console.error("Lỗi thêm admin: ", error);
      alert("Thêm admin mới thất bại vui lòng thử lại!");
    }
  };

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.title}>Add a new administrator</h1>

      <form onSubmit={handleAddNewAdmin}>
        <label className={styles.label}>Username</label>
        <input
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className={styles.label}>Password</label>
        <input
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className={styles.button}>Add</button>
      </form>
    </div>
  );
}
