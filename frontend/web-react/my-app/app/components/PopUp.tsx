"use client";
import { useRef, useEffect } from "react";
import "@/app/styles/PopUp.css";

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
    if (show) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  if (!show) return null;

  return (
    <div className="popup-overlay">
      <div ref={popupRef}>{children}</div>
    </div>
  );
}
