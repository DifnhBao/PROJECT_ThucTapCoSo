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
  const content = <ModalProvider><PlayerProvider><LikeProvider>{children}</LikeProvider></PlayerProvider></ModalProvider>;
  return (
    <UserProvider>
      {/* Upload and Library share the user cache. Admin pages own their cache boundary. */}
      {isAdmin ? content : <AccountCacheBoundary scope="user">{content}</AccountCacheBoundary>}
    </UserProvider>
  );
}
