"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/context/UserContext";
import { loginUser, fetchCurrentUser } from "@/app/utils/authApi";
import "@/app/styles/auth.css";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { openModal, closeModal } = useModal();
  const { user, setUser, refreshUser } = useUser();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser(username, password);
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Đăng nhập thất bại!");
        return;
      }

      alert(data.message);

      await refreshUser();

      // Đóng modal
      closeModal();
      // refresh trang để cập nhật thông tin user
      // router.refresh();
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại, vui lòng thử lại!");
    }
  };

  return (
    <div className="auth-container sign-in-page">
      <header>
        <div className="logo">
          <a>
            <img src="/images/Logo/logo.png" alt="logo" />
          </a>
        </div>
      </header>

      <h1>Sign in to Enjoy</h1>
      <form onSubmit={handleSignIn}>
        <label htmlFor="username" className="form_label">
          Username
        </label>
        <input
          id="username"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label htmlFor="password" className="form_label">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="options">
          <label className="switch">
            <input type="checkbox" />
            <span className="slider round"></span>
          </label>
          <label style={{ fontSize: "13px", color: "#6b7280" }}>
            Remember me
          </label>
        </div>
        <button type="submit" className="submit">
          Sign In
        </button>
      </form>
      <div className="fogot-password">
        <a href="#">Forgot your password?</a>
      </div>
      <p className="switch-form">
        Not registered?{" "}
        <a className="create" onClick={() => openModal("register")}>
          Create an account
        </a>
      </p>
    </div>
  );
}
