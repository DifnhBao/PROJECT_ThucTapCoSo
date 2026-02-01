"use client";

import "@/app/styles/globals.css";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import Player from "@/app/components/MusicContainer/Player";
import { useEffect } from "react";

import { useModal } from "@/app/context/ModalContext";
import { useUser } from "@/app/context/UserContext";

import { UserProvider } from "@/app/context/UserContext";
import { ModalProvider } from "@/app/context/ModalContext";
import { PlayerProvider } from "@/app/context/PlayerContext";
import { MusicDataProvider } from "@/app/context/MusicDataContext";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ModalProvider>
        <MusicDataProvider>
          <PlayerProvider>
            <MainLayout>{children}</MainLayout>
          </PlayerProvider>
        </MusicDataProvider>
      </ModalProvider>
    </UserProvider>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    if (loading) return;
    if (!user) openModal("signin");
  }, [user, loading]);

  return (
    <>
      {/* <Sidebar /> */}
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
