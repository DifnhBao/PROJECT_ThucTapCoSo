"use client";
import styles from "@/app/components/layout/Footer/UserPage/Footer.module.css";

export default function Footer() {
  return (
    <div className={styles.footer}>
      <p className={styles.title}>TuneTrek</p>
      <p>Đồ án cá nhân · Bản demo web</p>
      <p>Dùng dữ liệu demo; không nhập thông tin cá nhân thật.</p>
    </div>
  );
}
