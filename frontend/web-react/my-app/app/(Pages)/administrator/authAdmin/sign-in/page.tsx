"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
import { useAdminUser } from "@/app/context/AdminUserContext";
import { loginAdmin, fetchCurrentAdmin } from "@/app/utils/authApi";
import "@/app/styles/auth.css";

export default function SignInAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { openModal, closeModal } = useModal();
  const { admin, setAdmin, checkAdmin } = useAdminUser();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginAdmin(username, password);
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Đăng nhập thất bại!");
        return;
      }

      alert(data.message);
      await checkAdmin();
      // Đóng modal
      closeModal();

      router.replace("/administrator/ManageUser");
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

      <h1>Welcome, administrator</h1>
      <form onSubmit={handleSignIn}>
        <label htmlFor="email" className="form_label">
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
          <label style={{ fontSize: "13px" }}>Remember me</label>
        </div>
        <button type="submit" className="submit">
          Sign In
        </button>
      </form>
      <div className="fogot-password">
        <a href="#">Forgot your password?</a>
      </div>
      {/* <p>
        Not registered?{" "}
        <a className="create" onClick={() => openModal("register-admin")}>
          Create an account
        </a>
      </p> */}
    </div>
  );
}
