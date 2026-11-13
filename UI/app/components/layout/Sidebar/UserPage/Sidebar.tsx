"use client";
import styles from "@/app/components/layout/Sidebar/UserPage/Sidebar.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Footer from "../../Footer/UserPage/Footer";

import { BsHeart } from "react-icons/bs";
import { PiPlaylist } from "react-icons/pi";
import { RiHome5Fill } from "react-icons/ri";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className={styles.menu}>
      <nav className={styles.nav}>
        <Link
          href="/Home"
          className={`${styles.link} ${
            pathname === "/Home" ? styles.active : ""
          }`}
        >
          <RiHome5Fill className={styles.icon} /> Home
        </Link>

        <Link
          href="/Library"
          className={`${styles.link} ${
            pathname.startsWith("/Library") ? styles.active : ""
          }`}
        >
          <BsHeart className={styles.icon} /> Likes
        </Link>

        <Link
          href="/Playlist"
          className={`${styles.link} ${
            pathname.startsWith("/Playlist") ? styles.active : ""
          }`}
        >
          <PiPlaylist className={styles.icon} /> Playlist
        </Link>


      </nav>

      <Footer />
    </div>
  );
}
