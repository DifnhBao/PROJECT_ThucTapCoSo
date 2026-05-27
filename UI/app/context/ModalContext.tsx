"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import Modal from "@/app/components/ui/Modal";
import Profile from "@/app/features/user/components/Profile";
import EditUserProfile from "../features/user/components/EditUserProfile";
import ChangePassword from "../features/auth/components/ChangePassword";
import SongFormModal from "../features/admin/components/SongFormModal";
import UploadSongModal from "../features/song/components/UploadSongModal";

import dynamic from "next/dynamic";

// Dynamic import cho user
const SignInPage = dynamic(() => import("@/app/(Pages)/login/page"));
const RegisterPage = dynamic(() => import("@/app/(Pages)/register/page"));

// Dynamic import cho admin
const SignInAdminPage = dynamic(
  () => import("@/app/(Pages)/administrator/login/page"),
);

const AddNewAdmin = dynamic(
  () => import("@/app/features/admin/components/AddAdmin"),
);

const ResetAdminPassword = dynamic(
  () => import("@/app/features/admin/components/ResetAdminPassword"),
);

type ModalType =
  | "profile"
  | "signin"
  | "register"
  | "signin-admin"
  | "register-admin"
  | "add-new-admin"
  | "edit-user-profile"
  | "change-password"
  | "reset-admin-password"
  | "song-form"
  | "upload-song"
  | null;

interface ModalContextType {
  openModal: (type: Exclude<ModalType, null>, data?: any) => void;
  closeModal: () => void;
  modalData: any;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (type: Exclude<ModalType, null>, data?: any) => {
    setModalContent(type);
    setModalData(data || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalContent(null);
  };

  const renderModalContent = () => {
    switch (modalContent) {
      case "signin":
        return <SignInPage />;
      case "register":
        return <RegisterPage />;
      case "add-new-admin":
        return <AddNewAdmin />;
      case "edit-user-profile":
        return <EditUserProfile userData={modalData} />;
      case "change-password":
        return <ChangePassword />;
      case "song-form":
        return (
          <SongFormModal song={modalData.song} onSave={modalData.onSave} />
        );
      case "upload-song":
        return <UploadSongModal />;
      case "reset-admin-password":
        return <ResetAdminPassword admin={modalData} />;
      default:
        return null;
    }
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, modalData }}>
      {children}
      <Modal isOpen={isOpen} onClose={closeModal}>
        {renderModalContent()}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal phải được gọi trong ModalProvider");
  }
  return context;
}
