"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/app/context/ModalContext";
import { useAdminUser } from "@/app/context/AdminUserContext";

export default function AdminPage() {
  const { admin, loading } = useAdminUser();
  const { openModal, closeModal } = useModal();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      openModal("signin-admin");
    }
  }, [admin, loading]);

  if (loading) return null;

  return (
    <h1
      style={{ fontSize: "100px", padding: "150px 10px", textAlign: "center" }}
    >
      Welcome to Admin Page!
    </h1>
  );
}
