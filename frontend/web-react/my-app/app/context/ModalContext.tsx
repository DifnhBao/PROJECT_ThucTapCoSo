"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import Modal from "@/app/components/Modal";
import Profile from "@/app/components/Profile";
import EditUserProfile from "../components/EditUserProfile";
import ChangePassword from "../components/ChangePassword";
import SongFormModal from "../components/AdminPage/SongFormModal";

import dynamic from "next/dynamic";

// Dynamic import cho user
const SignInPage = dynamic(
  () => import("@/app/(Pages)/(main)/auth/sign-in/page")
);
const RegisterPage = dynamic(
  () => import("@/app/(Pages)/(main)/auth/register/page")
);

// Dynamic import cho admin
const SignInAdminPage = dynamic(
  () => import("@/app/(Pages)/administrator/authAdmin/sign-in/page")
);
const RegisterAdminPage = dynamic(
  () => import("@/app/(Pages)/administrator/authAdmin/register/page")
);

const AddNewAdmin = dynamic(
  () => import("@/app/components/AdminPage/AddAdmin")
);

const ResetAdminPassword = dynamic(
  () => import("@/app/components/AdminPage/ResetAdminPassword")
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
      case "profile":
        return <Profile initialData={modalData} />;
      case "signin":
        return <SignInPage />;
      case "register":
        return <RegisterPage />;
      case "signin-admin":
        return <SignInAdminPage />;
      case "register-admin":
        return <RegisterAdminPage />;
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
