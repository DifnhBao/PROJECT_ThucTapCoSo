"use client";
import { useSyncExternalStore } from 'react';
import { getAuth,getServerAuth,subscribeAuth,type AuthScope } from './auth-state';
const subscribeUser = (listener: () => void) => subscribeAuth('user', listener);
const subscribeAdmin = (listener: () => void) => subscribeAuth('admin', listener);
const userSnapshot = () => getAuth('user');
const adminSnapshot = () => getAuth('admin');
export const useAuthState = (scope: AuthScope) => useSyncExternalStore(scope === 'user' ? subscribeUser : subscribeAdmin, scope === 'user' ? userSnapshot : adminSnapshot, getServerAuth);
