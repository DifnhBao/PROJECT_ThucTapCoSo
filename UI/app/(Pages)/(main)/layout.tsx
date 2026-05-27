"use client";

import "@/app/styles/globals.css";
import Sidebar from "@/app/components/layout/Sidebar/UserPage/Sidebar";
import Header from "@/app/components/layout/Header/UserPage/Header";
import Player from "@/app/features/player/components/Player";
import { useEffect } from "react";
import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/features/user/context/UserContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const { openModal } = useModal();

  useEffect(() => {
    if (loading) return;
    if (!user) openModal("signin");
  }, [user, loading]);

  return (
    <>
      <Sidebar />
      <div className="main">
        <Header />
        <div id="content" className="content">
          {children}
        </div>
      </div>
      <Player />
    </>
  );
}
