"use client";

import Header from "@/app/components/layout/Header/AdminPage/Header";
import Sidebar from "@/app/components/layout/Sidebar/AdminPage/Sidebar";
import { AdminUserProvider, useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { usePathname } from "next/navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminUser();
  const pathname = usePathname();
  const isLoginPage = pathname === "/administrator/login";

  if (isLoginPage) {
    return <div className="login-content">{children}</div>;
  }

  return (
    <>
      <Header />
      <Sidebar />
      <div className="main_content">{children}</div>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminUserProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminUserProvider>
  );
}
