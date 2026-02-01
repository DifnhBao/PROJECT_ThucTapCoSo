"use client";
import "@/app/styles/header-bar.css";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { HiOutlineUpload } from "react-icons/hi";
import { useRouter } from "next/navigation";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/context/UserContext";
import { logoutUser } from "../utils/authApi";
import PopUp from "./PopUp";
import SearchBarComponent from "./SearchBar/SearchBarComponent";
import Sidebar from "./Sidebar";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { openModal } = useModal();
  const [q, setQ] = useState("");
  const { user, loading, setUser } = useUser();
  const router = useRouter();

  return (
    <header className="header">
      <div className="left">
        <div className="logo">
          <Link href="/">
            <img src="/images/Logo/logo.png" alt="logo web page" />
          </Link>
        </div>
        <SearchBarComponent />
      </div>

      {/* Side bar */}
      <Sidebar />

      <div className="right">
        {/* Upload icon */}
        {/* <HiOutlineUpload id="upload-icon" /> */}
        <div className="user-area">
          {loading ? null : user ? (
            <div className="user-greeting">
              <button
                className="profile-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span>Hi, {user?.username || "..."}</span>
                <img
                  src="/images/Avatar/avt01.png"
                  alt="Avatar"
                  className="avatar"
                />
              </button>
              {showUserMenu && (
                <PopUp
                  show={showUserMenu}
                  onClose={() => setShowUserMenu(false)}
                >
                  <div className="user-popup">
                    <div className="user-info">
                      <img src="/images/Avatar/avt01.png" className="avatar" />
                      <div>
                        <strong>{user.username}</strong>
                        <p>Thành viên Miễn phí</p>
                      </div>
                    </div>

                    <button
                      className="logout-btn"
                      onClick={() => openModal("profile")}
                    >
                      <i className="fa-regular fa-user"></i>
                      Xem hồ sơ
                    </button>

                    <button
                      className="logout-btn"
                      onClick={() => openModal("change-password")}
                    >
                      <i className="fa-solid fa-key"></i>
                      Thay đổi mật khẩu
                    </button>

                    <button
                      className="logout-btn"
                      onClick={async () => {
                        await logoutUser();
                        setUser(null);
                        router.replace("/explore");
                      }}
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket"></i>
                      Đăng xuất
                    </button>
                  </div>
                </PopUp>
              )}
            </div>
          ) : (
            <div className="auth-box">
              <button className="sign-in" onClick={() => openModal("signin")}>
                Sign in
              </button>

              <button
                className="register"
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
