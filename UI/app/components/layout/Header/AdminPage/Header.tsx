"use client";

import { useRouter } from "next/navigation";
import "@/app/components/layout/Header/AdminPage/Header.css";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
// import { logoutAdmin } from "@/app/utils/authApi";
import { logoutAdminService } from "@/app/features/admin/service";

export default function Header() {
  const { admin, setAdmin, loading } = useAdminUser();
  const router = useRouter();

  if (loading) return null;

  const handleLogout = async () => {
    try {
      await logoutAdminService();
      setAdmin(null);
      router.replace("/administrator/login");
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
        {/* Sidebar moved to layout */}
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
                router.push("/administrator/login");
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
