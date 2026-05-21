"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/styles/Auth.module.css";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/features/user/context/UserContext";
import { loginService } from "@/app/features/auth/service";
import Logo from "@/app/components/ui/Logo";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { openModal, closeModal } = useModal();
  const { refreshUser } = useUser();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginService(username, password);
      alert(data.message);
      await refreshUser();
      closeModal();
      router.refresh();
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng nhập thất bại";
      alert(message);
    }
  };

  return (
    <div className={styles.authContainer}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <a>
            <Logo size={80} />
            {/* <img
                src="/images/Logo/logo.png"
                alt="logo"
                className={styles.logoImg}
              /> */}
          </a>
        </div>
      </header>

      <h1 className={styles.title}>Welcome Back</h1>
      <p className={styles.subtitle}>Sign in to continue to Enjoy</p>

      <form onSubmit={handleSignIn} className={styles.form}>
        <div className={styles.formField}>
          <label htmlFor="username" className={styles.formLabel}>
            Username
          </label>
          <input
            id="username"
            type="text"
            className={styles.formInput}
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="password" className={styles.formLabel}>
            Password
          </label>
          <input
            id="password"
            type="password"
            className={styles.formInput}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className={styles.optionsRow}>
          <label className={styles.rememberMe}>
            <input type="checkbox" name="remember" />
            <span className={styles.rememberMeSpan}>Remember me</span>
          </label>

          <a href="#" className={styles.forgotPasswordLink}>
            Forgot password?
          </a>
        </div>

        <button type="submit" className={styles.submitButton}>
          Sign In
        </button>
      </form>

      <div className={styles.switchFormFooter}>
        <p>
          Don't have an account?{" "}
          <span
            className={styles.switchLink}
            onClick={() => openModal("register")}
          >
            Create one for free
          </span>
        </p>
      </div>
    </div>
  );
}
