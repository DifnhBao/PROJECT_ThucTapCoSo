"use client";
import dynamic from 'next/dynamic';
import { createContext,useCallback,useContext,useEffect,useState,type ReactNode } from 'react';
import Modal from '../components/ui/Modal';
import SongFormModal from '../features/admin/components/SongFormModal';
import ChangePassword from '../features/auth/components/ChangePassword';
import UploadSongModal from '../features/song/components/UploadSongModal';
import EditUserProfile from '../features/user/components/EditUserProfile';
import { getAuth,subscribeAuth,type AuthScope } from '../lib/auth-state';
import type { SongDto,SongMetadata } from '../types/api';
import type { User } from '../types/music';
const SignInPage = dynamic(() => import('../(Pages)/login/page'));
const RegisterPage = dynamic(() => import('../(Pages)/register/page'));
const AddNewAdmin = dynamic(() => import('../features/admin/components/AddAdmin'));
const ResetAdminPassword = dynamic(() => import('../features/admin/components/ResetAdminPassword'));
export type SongSave = (data: SongMetadata | FormData) => Promise<void>;
type ModalArgs =
  | [type: 'signin' | 'register' | 'change-password' | 'upload-song']
  | [type: 'edit-user-profile' | 'reset-admin-password', data: User]
  | [type: 'song-form', data: { song: SongDto | null; onSave: SongSave }]
  | [type: 'add-new-admin', data?: { onCreated: () => Promise<unknown> }]
  | [type: 'profile', data?: unknown];
interface ModalContextType { openModal: (...args: ModalArgs) => void; closeModal: () => void; modalData: unknown }
const ModalContext = createContext<ModalContextType | undefined>(undefined);
export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalArgs | null>(null);
  const openModal = useCallback((...args: ModalArgs) => setModal(args), []);
  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    const epochs = { user: getAuth('user').epoch, admin: getAuth('admin').epoch };
    const reset = (scope: AuthScope) => { const epoch = getAuth(scope).epoch; if (epochs[scope] !== epoch) { epochs[scope] = epoch; setModal(null); } };
    const user = subscribeAuth('user', () => reset('user')), admin = subscribeAuth('admin', () => reset('admin'));
    return () => { user(); admin(); };
  }, []);
  const content = () => {
    if (!modal) return null;
    switch (modal[0]) {
      case 'signin': return <SignInPage />;
      case 'register': return <RegisterPage />;
      case 'add-new-admin': return <AddNewAdmin onCreated={modal[1]?.onCreated} />;
      case 'edit-user-profile': return <EditUserProfile key={modal[1].userId} userData={modal[1]} />;
      case 'change-password': return <ChangePassword />;
      case 'song-form': return <SongFormModal key={modal[1].song?.song_id ?? 'new'} song={modal[1].song} onSave={modal[1].onSave} />;
      case 'upload-song': return <UploadSongModal />;
      case 'reset-admin-password': return <ResetAdminPassword admin={modal[1]} />;
      default: return null;
    }
  };
  return <ModalContext.Provider value={{ openModal, closeModal, modalData: modal?.[1] ?? null }}>{children}<Modal isOpen={modal !== null} onClose={closeModal}>{content()}</Modal></ModalContext.Provider>;
}
export function useModal() { const context = useContext(ModalContext); if (!context) throw new Error('useModal phải được gọi trong ModalProvider'); return context; }
