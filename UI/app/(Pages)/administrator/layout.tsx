"use client";
import { AccountCacheBoundary } from '../../lib/AccountCacheBoundary';

import Header from "@/app/components/layout/Header/AdminPage/Header";
import Sidebar from "@/app/components/layout/Sidebar/AdminPage/Sidebar";
import { AdminUserProvider } from "@/app/features/admin/context/AdminUserContext";
import { usePathname } from "next/navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/administrator/login";

  // Session discovery must not remount an in-progress login form.
  if (isLoginPage) {
    return <div className="login-content">{children}</div>;
  }

  return (
    <AccountCacheBoundary scope="admin">
      <Header />
      <Sidebar />
      <div className="main_content">{children}</div>
    </AccountCacheBoundary>
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
