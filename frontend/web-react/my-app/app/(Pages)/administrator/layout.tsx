"use client";

import "@/app/styles/AdminPage/Admin.css";
import "@/app/styles/AdminPage/Dashboard.css";
import Sidebar from "@/app/components/AdminPage/Sidebar";
import Header from "@/app/components/AdminPage/Header";

import { AdminUserProvider } from "@/app/context/AdminUserContext";
import { ModalProvider } from "@/app/context/ModalContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div suppressHydrationWarning>
      <AdminUserProvider>
        <ModalProvider>
          {/* <Sidebar /> */}
          <div className="main-page-admin">
            <Header />
            <div className="main_content" >{children}</div>
          </div>
        </ModalProvider>
      </AdminUserProvider>
    </div>
  );
}
