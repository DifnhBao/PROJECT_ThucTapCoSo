"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/components/layout/Sidebar/UserPage/Sidebar.module.css";

import Footer from "../../Footer/UserPage/Footer";

import { RiHome5Fill } from "react-icons/ri";
import { BsHeart } from "react-icons/bs";
import { PiPlaylist } from "react-icons/pi";
import { HiOutlineUser } from "react-icons/hi2";

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

        <Link
          href="/Following"
          className={`${styles.link} ${
            pathname.startsWith("/Following") ? styles.active : ""
          }`}
        >
          <HiOutlineUser className={styles.icon} /> Following
        </Link>
      </nav>

      <Footer />
    </div>
  );
}
