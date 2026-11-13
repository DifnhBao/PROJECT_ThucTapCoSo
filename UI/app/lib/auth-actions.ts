import { isRecord } from './api-contract';
import type { AxiosResponse } from 'axios';
import { assertAuth,beginAuthChange,discoverAuth,getAuth,sessionChanged,setPrincipal,toUser,type AuthScope } from './auth-state';
import { announceAuth,authActionFinished,withAuthLock } from './auth-sync';
const queues: Partial<Record<AuthScope, Promise<unknown>>> = {};
// Serialize login/logout in this tab. A late login response cannot overwrite a
// newer login's cookies. Starting an action invalidates old private requests.
export function authAction<T>(scope: AuthScope, action: 'login' | 'logout', request: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
  const epoch = beginAuthChange(scope), previous = queues[scope];
  announceAuth(scope, 'begin');
  const task = (async () => {
    if (previous) await previous.catch(() => {});
    assertAuth(scope, epoch);
    try {
      const response = await withAuthLock(scope, () => { assertAuth(scope, epoch); return request(); });
      if (getAuth(scope).epoch !== epoch) throw sessionChanged();
      const data: unknown = response.data;
      const principal = isRecord(data) ? scope === 'admin' ? data.admin : isRecord(data.data) ? data.data.user : null : null;
      setPrincipal(scope, action === 'login' ? toUser(principal) : null, epoch);
      return response;
    } catch (error) { setPrincipal(scope, null, epoch); throw error; }
  })().finally(() => {
    if (queues[scope] !== task) return;
    delete queues[scope];
    // Another tab may have superseded this action before it acquired the lock.
    // Re-read the active identity instead of leaving the UI in "changing".
    if (getAuth(scope).status === 'changing') discoverAuth(scope);
    authActionFinished(scope);
  });
  queues[scope] = task; return task;
}
