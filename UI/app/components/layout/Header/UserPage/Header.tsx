"use client";
import styles from "@/app/components/layout/Header/UserPage/Header.module.css";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/features/user/context/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLogout } from "../../../../features/auth/useLogout";
import PopUp from "../../../ui/PopUp";
import SearchBarComponent from "../../../ui/SearchBar/SearchBarComponent";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { openModal } = useModal();
  const { user, loading } = useUser();
  const { logout } = useLogout();
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Link href="/Home">
            <span className={styles.logoText}>BTM</span>
          </Link>
        </div>

        <SearchBarComponent />
      </div>

      <div className={styles.right}>
        {/* Nút upload nhạc - chỉ hiện khi đã đăng nhập */}
        {user && (
          <button
            className={styles.uploadBtn}
            onClick={() => openModal("upload-song")}
            title="Đăng bài hát"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Đăng nhạc</span>
          </button>
        )}

        <div className={styles.userArea}>
          {loading ? null : user ? (
            <div className={styles.userGreeting}>
              <button
                className={styles.profileBtn}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <img
                  src={user?.avatar || "/images/Avatar/avt01.png"}
                  alt="Avatar"
                  className={styles.avatar}
                />

                <div className={styles.userMeta}>
                  <span className={styles.username}>{user?.username}</span>
                </div>

                <i
                  className={`fa-solid fa-chevron-down ${styles.arrow} ${
                    showUserMenu ? styles.arrowActive : ""
                  }`}
                ></i>
              </button>

              {showUserMenu && (
                <PopUp
                  show={showUserMenu}
                  onClose={() => setShowUserMenu(false)}
                >
                  <div className={styles.userPopup}>
                    <button
                      className={styles.logoutBtn}
                      onClick={() => {
                        setShowUserMenu(false); // Đóng popup menu lại
                        router.push("/Profile"); // Chuyển hướng sang trang profile
                      }}
                    >
                      Xem hồ sơ
                    </button>

                    <button
                      className={styles.logoutBtn}
                      onClick={() => openModal("change-password")}
                    >
                      Thay đổi mật khẩu
                    </button>

                    <button className={styles.logoutBtn} onClick={logout}>
                      Đăng xuất
                    </button>
                  </div>
                </PopUp>
              )}
            </div>
          ) : (
            <div className={styles.authBox}>
              <button
                className={styles.signIn}
                onClick={() => openModal("signin")}
              >
                Sign in
              </button>

              <button
                className={styles.register}
                onClick={() => openModal("register")}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
