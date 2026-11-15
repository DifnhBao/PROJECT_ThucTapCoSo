"use client";
import Header from "@/app/components/layout/Header/UserPage/Header";
import Sidebar from "@/app/components/layout/Sidebar/UserPage/Sidebar";
import Player from "@/app/features/player/components/Player";
import "@/app/styles/globals.css";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {


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
