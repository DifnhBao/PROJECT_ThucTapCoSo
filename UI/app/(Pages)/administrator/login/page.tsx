"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import styles from "@/app/styles/Auth.module.css";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { loginAdminService } from "@/app/features/admin/service";
import Logo from "@/app/components/ui/Logo";

export default function SignInAdminPage() {
  const router = useRouter();
  const { checkAdmin } = useAdminUser();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginAdminService(username, password);
      alert(data.message);
      await checkAdmin();
      router.replace("/administrator/ManageUser");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại, vui lòng thử lại!");
    }
  };

  return (
    <div className={`${styles.authWrapper} ${styles.forAdminPage}`}>
      <div className={styles.authContainer}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <Logo size={80} />
            {/* <a>
              <img src="/images/Logo/logo.png" alt="logo" />
            </a> */}
          </div>
        </header>

        <h1 className={styles.title}>Welcome, administrator</h1>

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
      </div>
    </div>
  );
}
