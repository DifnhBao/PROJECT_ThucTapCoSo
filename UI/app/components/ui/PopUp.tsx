"use client";
import { useRef, useEffect } from "react";
import styles from "@/app/styles/PopUp.module.css";

interface PopUpProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function UserMenuPopup({ show, onClose, children }: PopUpProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div ref={popupRef}>{children}</div>
    </div>
  );
}
