"use client";
import { createContext,useCallback,useContext,useEffect } from 'react';
import { getAuth,setPrincipal,toUser } from '../../../lib/auth-state';
import { initializeAuthSync } from '../../../lib/auth-sync';
import { useAuthState } from '../../../lib/use-auth-state';
import type { User } from '../../../types/music';
import { getCurrentAdminService } from '../service';
type AdminContextType = { admin: User | null; setAdmin: React.Dispatch<React.SetStateAction<User | null>>; loading: boolean; checkAdmin: () => Promise<void> };
const AdminUserContext = createContext<AdminContextType | undefined>(undefined);
export function AdminUserProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useAuthState('admin');
  const checkAdmin = useCallback(async () => {
    const epoch = getAuth('admin').epoch;
    try { const data = await getCurrentAdminService(); setPrincipal('admin', toUser(data.data), epoch); }
    catch { setPrincipal('admin', null, epoch); }
  }, []);
  const setAdmin = useCallback<React.Dispatch<React.SetStateAction<User | null>>>((next) => {
    const current = getAuth('admin'); setPrincipal('admin', typeof next === 'function' ? next(current.principal) : next, current.epoch);
  }, []);
  useEffect(() => { initializeAuthSync(); let active = true; queueMicrotask(() => { if (active && snapshot.status === 'unknown') void checkAdmin(); }); return () => { active = false; }; }, [snapshot.epoch, snapshot.status, checkAdmin]);
  return <AdminUserContext.Provider value={{ admin: snapshot.principal, setAdmin, loading: snapshot.status === 'unknown' || snapshot.status === 'changing', checkAdmin }}>{children}</AdminUserContext.Provider>;
}
export function useAdminUser() { const value = useContext(AdminUserContext); if (!value) throw new Error('useAdminUser phải được dùng trong AdminUserProvider'); return value; }
