"use client";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { admin, loading } = useAdminUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!admin) {
      router.replace("/administrator/login");
    } else {
      router.replace("/administrator/Statistics");
    }
  }, [admin, loading, router]);

  return <div>Đang chuyển hướng...</div>;
}
