"use client";
import styles from "@/app/styles/Modal.module.css";
import React from "react";
import { useDialog } from "@/app/lib/use-dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const dialog = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Hộp thoại" tabIndex={-1} className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <button aria-label="Đóng hộp thoại" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
