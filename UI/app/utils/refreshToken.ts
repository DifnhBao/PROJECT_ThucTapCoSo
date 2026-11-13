// Compatibility names: all callers now use the same transport/replay policy.
import { apiFetch } from '../lib/api-transport';
import { refreshSession } from '../lib/refresh-session';
export const refreshTokenByAdmin = () => refreshSession('admin');
export const refreshTokenByUser = () => refreshSession('user');
export const fetchWithAutoRefresh = (url: string, options: RequestInit = {}, context: { role: 'admin' | 'user' }, retry = true) => apiFetch(url, options, context.role, retry);
export const adminFetch = (url: string, options?: RequestInit) => apiFetch(url, options, 'admin');
export const userFetch = (url: string, options?: RequestInit) => apiFetch(url, options, 'user');
