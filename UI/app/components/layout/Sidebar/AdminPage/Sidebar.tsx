"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/app/components/layout/Sidebar/AdminPage/Sidebar.css";
import { fetchPendingSongsCount } from "@/app/features/song/song.api";

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await fetchPendingSongsCount();
        setPendingCount(count);
      } catch {
        // ignore
      }
    };
    loadCount();

    // Polling mỗi 30 giây
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sidebar">
      <nav>
        <Link
          href="/administrator/Statistics"
          className={pathname === "/administrator/Statistics" ? "active" : ""}
        >
          <i className="fa-solid fa-chart-line"></i> Statistics
        </Link>
        <Link
          href="/administrator/ManageUser"
          className={pathname === "/administrator/ManageUser" ? "active" : ""}
        >
          <i className="fa-solid fa-users"></i> Manage User
        </Link>
        <Link
          href="/administrator/ManageAdmin"
          className={pathname === "/administrator/ManageAdmin" ? "active" : ""}
        >
          <i className="fa-solid fa-user-shield"></i> Manage Admin
        </Link>
        <Link
          href="/administrator/ManageSong"
          className={pathname === "/administrator/ManageSong" ? "active" : ""}
        >
          <i className="fa-solid fa-list"></i> Manage Song
        </Link>
        <Link
          href="/administrator/PendingSongs"
          className={`${pathname === "/administrator/PendingSongs" ? "active" : ""} pending-link`}
        >
          <i className="fa-solid fa-clock"></i> Pending Songs
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount}</span>
          )}
        </Link>
      </nav>
    </div>
  );
}
