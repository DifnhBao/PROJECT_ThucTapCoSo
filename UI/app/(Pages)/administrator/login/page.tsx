"use client";
import { formError } from '@/app/lib/form-error';
import Logo from "@/app/components/ui/Logo";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { loginAdminService } from "@/app/features/admin/service";
import styles from "@/app/styles/Auth.module.css";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInAdminPage() {
  const router = useRouter();
  const { checkAdmin } = useAdminUser();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFailure("");
    setSubmitting(true);
    try {
      const data = await loginAdminService(username, password);
      alert(data.message);
      await checkAdmin();
      router.replace("/administrator/ManageUser");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setFailure(formError(error));
    } finally { setSubmitting(false); }
  };

  return (
    <div className={`${styles.authWrapper} ${styles.forAdminPage}`}>
      <div className={styles.authContainer}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <Logo size={80} />

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


          </div>

          {failure && <p role="alert">{failure}</p>}
          <button disabled={submitting} type="submit" className={styles.submitButton}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
