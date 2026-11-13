import { beginAuthChange,discoverAuth,getAuth,type AuthScope } from './auth-state';
let channel: BroadcastChannel | null = null, initialized = false;
const key = 'tunetrek:auth-change';
type Notice = { scope: AuthScope; phase: 'begin' | 'end' };
export function initializeAuthSync() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const receive = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const item = value as Partial<Notice>;
    if (item.scope !== 'user' && item.scope !== 'admin') return;
    if (item.phase === 'begin') beginAuthChange(item.scope);
    if (item.phase === 'end') discoverAuth(item.scope); // Re-read authenticated profile; never trust message identity.
  };
  if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel(key); channel.onmessage = (event) => receive(event.data); }
  else window.addEventListener('storage', (event) => { if (event.key === key && event.newValue) { try { receive(JSON.parse(event.newValue)); } catch { /* Invalid notification. */ } } });
}
export function announceAuth(scope: AuthScope, phase: Notice['phase']) {
  initializeAuthSync(); if (typeof window === 'undefined') return;
  const notice = { scope, phase };
  if (channel) channel.postMessage(notice);
  else { try { localStorage.setItem(key, JSON.stringify({ ...notice, nonce: crypto.randomUUID() })); } catch { /* No cross-tab transport available. */ } }
}
export async function withAuthLock<T>(scope: AuthScope, run: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return await navigator.locks.request(`session-refresh-${scope}`, run);
  return await run();
}
export const authActionFinished = (scope: AuthScope) => { if (getAuth(scope).status !== 'changing') announceAuth(scope, 'end'); };
