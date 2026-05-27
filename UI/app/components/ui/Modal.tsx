"use client";

import React from "react";
import styles from "@/app/styles/Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
