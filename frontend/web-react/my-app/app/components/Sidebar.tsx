"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../styles/SideBar.css";
import { IoLibraryOutline } from "react-icons/io5";
import { PiPlaylistDuotone } from "react-icons/pi";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="menu">
      <nav>
        <Link
          href="/explore"
          className={pathname === "/explore" ? "active" : ""}
        >
          <i className="fa-regular fa-compass icon" /> Explore
        </Link>
        <Link
          href="/library"
          className={pathname.startsWith("/library") ? "active" : ""}
        >
          <IoLibraryOutline className="icon" /> Library
        </Link>
        <Link
          href="#"
          className={pathname.startsWith("/myplaylists") ? "active" : ""}
        >
          <PiPlaylistDuotone className="icon" /> Playlist
        </Link>
      </nav>
    </div>
  );
}
