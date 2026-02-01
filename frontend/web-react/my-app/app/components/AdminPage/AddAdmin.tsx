"use client";

import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { addNewAdmin } from "@/app/utils/authApi";
import { mutate } from "swr";
// import "@/app/styles/auth.css";
import "@/app/styles/AdminPage/addAdmin.css";

export default function AddNewAdmin() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { closeModal } = useModal();

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Gửi dữ liệu này đến backend
      const res = await addNewAdmin(username, email, password);
      const data = await res.json();

      alert(data.message);

      if (res.ok) {
        mutate("admins");
        closeModal();
      }
    } catch (error) {
      console.error("Lỗi thêm admin: ", error);
      alert("Thêm admin mới thất bại vui lòng thử lại!");
    }
  };

  return (
    <div className="container">
      <h1>Add a new administrator</h1>
      <form onSubmit={handleAddNewAdmin}>
        <label htmlFor="username" className="form_label">
          Username
        </label>
        <input
          id="username"
          type="text"
          placeholder="abc"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label htmlFor="email" className="form_label">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="abc@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password" className="form_label">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="At least 8 characters, letters & numbers"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {/* <p className="switch-form">
        You already have an account?{" "}
        <a className="create" onClick={() => openModal("signin-admin")}>
          Sign in
        </a>
      </p> */}
    </div>
  );
}
