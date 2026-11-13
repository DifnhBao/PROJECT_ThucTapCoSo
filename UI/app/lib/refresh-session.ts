import { ApiError,readApiResponse } from './api-contract';
import { rawApiFetch } from './api-request';
import { assertAuth,authSignal,expireAuth,getAuth,refreshedAuth,sessionChanged,type AuthScope } from './auth-state';
export type { AuthScope } from './auth-state';
const pending = new Map<string, Promise<void>>();
export function refreshSession(scope: AuthScope, epoch = getAuth(scope).epoch, version = getAuth(scope).accessVersion): Promise<void> {
  const key = `${scope}:${epoch}`;
  if (pending.has(key)) return pending.get(key)!;
  const run = async () => {
    assertAuth(scope, epoch);
    if (getAuth(scope).status === 'expired') throw new ApiError('Phiên đã hết hạn.', 401, 'SESSION_EXPIRED');
    if (getAuth(scope).accessVersion !== version) return;
    const response = await rawApiFetch(`/auth/${scope === 'admin' ? 'admin/' : ''}refresh-token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-type': scope }, body: '{}', signal: AbortSignal.any([authSignal(scope), AbortSignal.timeout(10000)]),
    });
    await readApiResponse(response); refreshedAuth(scope, epoch);
  };
  const task = (async () => {
    if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(`session-refresh-${scope}`, run);
    else await run();
  })().catch((error) => { if (getAuth(scope).epoch !== epoch) throw sessionChanged(); expireAuth(scope, epoch); throw error; }).finally(() => { if (pending.get(key) === task) pending.delete(key); });
  pending.set(key, task); return task;
}
