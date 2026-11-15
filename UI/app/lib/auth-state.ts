import type { User } from '../types/music';
import { ApiError } from './api-contract';
export type AuthScope = 'user' | 'admin';
export type AuthSnapshot = Readonly<{ principal: User | null; epoch: number; accessVersion: number; status: 'unknown' | 'changing' | 'authenticated' | 'anonymous' | 'expired' }>;
const initial: AuthSnapshot = Object.freeze({ principal: null, epoch: 0, accessVersion: 0, status: 'unknown' });
const snapshots: Record<AuthScope, AuthSnapshot> = { user: initial, admin: initial };
const listeners: Record<AuthScope, Set<() => void>> = { user: new Set(), admin: new Set() };
const controllers = { user: new AbortController(), admin: new AbortController() };
export const getAuth = (scope: AuthScope) => snapshots[scope];
export const getServerAuth = () => initial;
export const authSignal = (scope: AuthScope) => controllers[scope].signal;
export const subscribeAuth = (scope: AuthScope, listener: () => void) => { listeners[scope].add(listener); return () => { listeners[scope].delete(listener); }; };
export const sessionChanged = () => new ApiError('Tài khoản đã thay đổi. Vui lòng thực hiện lại.', 0, 'AUTH_CONTEXT_CHANGED');
export function assertAuth(scope: AuthScope, epoch: number) { if (getAuth(scope).epoch !== epoch) throw sessionChanged(); }
function clearPlayerStorage() {
  if (typeof localStorage !== 'undefined') { try { localStorage.removeItem('player_state_v3'); localStorage.removeItem('player_state_v2'); } catch { /* Storage unavailable. */ } }
}
function publish(scope: AuthScope, update: Partial<AuthSnapshot>, invalidate: boolean) {
  const previous = getAuth(scope);
  snapshots[scope] = Object.freeze({ ...previous, ...update, epoch: previous.epoch + (invalidate ? 1 : 0) });
  if (invalidate) {
    controllers[scope].abort(); controllers[scope] = new AbortController();
    if (scope === 'user' && previous.status !== 'unknown') clearPlayerStorage();
  }
  listeners[scope].forEach((listener) => listener());
  return getAuth(scope).epoch;
}
export function beginAuthChange(scope: AuthScope) { if (scope === 'user') clearPlayerStorage(); return publish(scope, { principal: null, status: 'changing' }, true); }
export function discoverAuth(scope: AuthScope) { return publish(scope, { principal: null, status: 'unknown' }, true); }
export function setPrincipal(scope: AuthScope, principal: User | null, expectedEpoch = getAuth(scope).epoch) {
  if (getAuth(scope).epoch !== expectedEpoch) return;
  const previous = getAuth(scope);
  publish(scope, { principal, status: principal ? 'authenticated' : 'anonymous' }, previous.principal?.userId !== principal?.userId || previous.status === 'unknown');
}
export function expireAuth(scope: AuthScope, expectedEpoch: number) {
  if (getAuth(scope).epoch === expectedEpoch) publish(scope, { principal: null, status: 'expired' }, true);
}
export function refreshedAuth(scope: AuthScope, epoch: number) { assertAuth(scope, epoch); publish(scope, { accessVersion: getAuth(scope).accessVersion + 1 }, false); }
export function toUser(value: unknown): User | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>, id = Number(row.userId ?? row.user_id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const str = (name: string) => typeof row[name] === 'string' ? row[name] as string : '';
  return { ...row, userId: id, username: str('username'), email: str('email'), role: str('role'), actStatus: str('activity_status'), isActive: Boolean(row.is_active), avatar: str('avatar') };
}
