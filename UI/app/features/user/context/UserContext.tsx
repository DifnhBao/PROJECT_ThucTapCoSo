"use client";
import { createContext,useCallback,useContext,useEffect } from 'react';
import { getAuth,setPrincipal,toUser } from '../../../lib/auth-state';
import { initializeAuthSync } from '../../../lib/auth-sync';
import { useAuthState } from '../../../lib/use-auth-state';
import type { User } from '../../../types/music';
import { getCurrentUserService } from '../service';
type UserContextType = { user: User | null; setUser: React.Dispatch<React.SetStateAction<User | null>>; loading: boolean; refreshUser: () => Promise<void> };
const UserContext = createContext<UserContextType | undefined>(undefined);
export function UserProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useAuthState('user');
  const refreshUser = useCallback(async () => {
    const epoch = getAuth('user').epoch;
    try { const data = await getCurrentUserService(); setPrincipal('user', toUser(data.data), epoch); }
    catch { setPrincipal('user', null, epoch); }
  }, []);
  const setUser = useCallback<React.Dispatch<React.SetStateAction<User | null>>>((next) => {
    const current = getAuth('user'); setPrincipal('user', typeof next === 'function' ? next(current.principal) : next, current.epoch);
  }, []);
  useEffect(() => { initializeAuthSync(); let active = true; queueMicrotask(() => { if (active && snapshot.status === 'unknown') void refreshUser(); }); return () => { active = false; }; }, [snapshot.epoch, snapshot.status, refreshUser]);
  return <UserContext.Provider value={{ user: snapshot.principal, setUser, loading: snapshot.status === 'unknown' || snapshot.status === 'changing', refreshUser }}>{children}</UserContext.Provider>;
}
export function useUser() { const value = useContext(UserContext); if (!value) throw new Error('useUser phải được dùng trong UserProvider'); return value; }
