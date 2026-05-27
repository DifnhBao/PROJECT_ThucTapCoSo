"use client";

import { useState } from "react";
import { useModal } from "@/app/context/ModalContext";
// import { registerUser } from "@/app/utils/authApi";
import { registerService } from "@/app/features/auth/service";
import { validatePassword } from "@/app/utils/passwordValidator";
import styles from "@/app/styles/Auth.module.css";
import Logo from "@/app/components/ui/Logo";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { openModal } = useModal();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }

    try {
      const data = await registerService(username, email, password);
      alert(data.message);
      openModal("signin");
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng ký thất bại";
      alert(message);
    }
  };

  return (
    <div className={styles.authWrapper}>
      <div className={`${styles.authContainer} ${styles.registerPage}`}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <a>
              {/* <img
                src="/images/Logo/logo.png"
                alt="logo"
                className={styles.logoImg}
              /> */}
              <Logo size={80} />
            </a>
          </div>
        </header>

        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>
          Register to start listening to endless music
        </p>

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.formField}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              id="username"
              type="text"
              className={styles.formInput}
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={styles.formInput}
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="At least 8 chars, letters & numbers"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && <span className={styles.errorText}>{passwordError}</span>}
          </div>

          <button type="submit" className={styles.submitButton}>
            Get Started
          </button>
        </form>

        <div className={styles.switchFormFooter}>
          <p>
            Already have an account?{" "}
            <span
              className={styles.switchLink}
              onClick={() => openModal("signin")}
            >
              Sign in instead
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
