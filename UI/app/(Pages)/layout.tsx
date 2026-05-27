"use client";

import { UserProvider } from "@/app/features/user/context/UserContext";
import { ModalProvider } from "@/app/context/ModalContext";
import { PlayerProvider } from "@/app/features/player/context/PlayerContext";
import { LikeProvider } from "@/app/features/like/context/LikeContext";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ModalProvider>
        <PlayerProvider>
          <LikeProvider>{children}</LikeProvider>
        </PlayerProvider>
      </ModalProvider>
    </UserProvider>
  );
}
