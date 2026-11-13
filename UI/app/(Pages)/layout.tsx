"use client";
import { usePathname } from "next/navigation";
import { AccountCacheBoundary } from '../lib/AccountCacheBoundary';

import { ModalProvider } from "@/app/context/ModalContext";
import { LikeProvider } from "@/app/features/like/context/LikeContext";
import { PlayerProvider } from "@/app/features/player/context/PlayerContext";
import { UserProvider } from "@/app/features/user/context/UserContext";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = usePathname().startsWith("/administrator");
  const content = <PlayerProvider><LikeProvider>{children}</LikeProvider></PlayerProvider>;
  return (
    <UserProvider>
      <ModalProvider>
        {/* Admin pages own their cache boundary; user discovery must not remount admin forms. */}
        {isAdmin ? content : <AccountCacheBoundary scope="user">{content}</AccountCacheBoundary>}
      </ModalProvider>
    </UserProvider>
  );
}
