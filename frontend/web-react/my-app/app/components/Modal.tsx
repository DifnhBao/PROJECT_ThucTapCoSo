"use client";
import React from "react";
import "@/app/styles/Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Vùng nội dung modal */}
        <div className="modal-content">
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
