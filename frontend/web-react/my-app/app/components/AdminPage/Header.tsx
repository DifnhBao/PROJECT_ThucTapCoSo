"use client";
// import { useModal } from "@/app/context/ModalContext";
import { useRouter } from "next/navigation";
import { useAdminUser } from "@/app/context/AdminUserContext";
import { logoutAdmin } from "@/app/utils/authApi";
import { useModal } from "@/app/context/ModalContext";
import Sidebar from "@/app/components/AdminPage/Sidebar";

import "@/app/styles/AdminPage/ad-Header.css";
import "@/app/styles/AdminPage/ad-Sidebar.css";

export default function Header() {
  const { openModal } = useModal();
  const { admin, setAdmin, loading } = useAdminUser();
  const router = useRouter();

  if (loading) return null;

  const handleLogout = async () => {
    try {
      // Gọi API Logout đến backend
      await logoutAdmin();
      setAdmin(null);
      router.replace("/administrator");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      alert("Đăng xuất thất bại!");
    }
  };

  return (
    <div className="header">
      <div
        className="header-left"
        onClick={() => {
          router.push("/administrator");
        }}
      >
        <img src="../images/Logo/admin-logo.png" alt="logo web page" />
        <h2 id="page-title">Dashboard</h2>
      </div>

      <div className="header-center">
        <Sidebar />
      </div>

      <div className="header-right">
        {admin ? (
          <>
            <span>Hi, {admin.username}</span>
            <i className="fa-solid fa-user"></i>
            <button onClick={handleLogout} className="logout-from-dashboard">
              <i className="fa-solid fa-power-off"></i> log out
            </button>
          </>
        ) : (
          <>
            <i className="fa-solid fa-user"></i>
            <button
              className="logout-from-dashboard"
              onClick={() => {
                openModal("signin-admin");
              }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
