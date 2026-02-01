"use client";

import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { registerAdmin } from "@/app/utils/authApi";
import "@/app/styles/auth.css";

export default function RegisterAdminPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [confirmPW, setConfirmPW] = useState("");
  const { openModal } = useModal();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // gửi dữ liệu này đến backend
      const res = await registerAdmin(username, email, password);
      const data = await res.json();

      alert(data.message);

      openModal("signin-admin");
    } catch (error) {
      console.error("Lỗi đăng kí: ", error);
      alert("Đăng kí thất bại vui lòng thử lại!");
    }
  };

  return (
    <div className="auth-container register-page">
      <header>
        <div className="logo">
          <a>
            <img src="/images/Logo/logo.png" alt="logo" />
          </a>
        </div>
      </header>

      <h1>Become an administrator</h1>
      <form onSubmit={handleRegister}>
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
        {/* <label htmlFor="confirm_password" className="form_label">
          Password Confirmation
        </label>
        <input
          id="confirm_password"
          type="password"
          placeholder="Password Confirmation"
          value={confirmPW}
          onChange={(e) => setConfirmPW(e.target.value)}
          required
        /> */}
        <button type="submit">Register</button>
      </form>
      <p className="switch-form">
        You already have an account?{" "}
        <a className="create" onClick={() => openModal("signin-admin")}>
          Sign in
        </a>
      </p>
    </div>
  );
}
