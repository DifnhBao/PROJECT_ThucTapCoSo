import { ApiError } from './api-contract';
import { apiUrl,rawApiFetch } from './api-request';
import { assertAuth,authSignal,expireAuth,getAuth,sessionChanged,type AuthScope } from './auth-state';
import { refreshSession } from './refresh-session';
export async function apiFetch(url: string, options: RequestInit = {}, scope?: AuthScope, retry = true): Promise<Response> {
  const path = new URL(apiUrl(url), 'http://local.invalid').pathname;
  const authEndpoint = /\/auth\/(?:admin\/)?(?:login|register|logout|refresh-token)\/?$/.test(path);
  const publicRead = (!options.method || options.method.toUpperCase() === 'GET') && (/\/songs(?:\/search|\/\d+)?\/?$/.test(path) || /\/artists(?:\/top|\/\d+)?\/?$/.test(path) || /\/ratings\/song\/\d+\/summary\/?$/.test(path) || /\/recommendations\/songs\/\d+\/similar\/?$/.test(path));
  const guestPlaylist = /\/playlists\/\d+\/?$/.test(path) && (!options.method || options.method.toUpperCase() === 'GET') && scope && ['anonymous', 'expired'].includes(getAuth(scope).status);
  const fenced = scope && !authEndpoint && !publicRead && !guestPlaylist ? scope : undefined;
  const ticket = fenced ? getAuth(fenced) : null;
  if (fenced && ticket && ['expired', 'changing', 'anonymous'].includes(ticket.status)) throw new ApiError('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.', 401, 'SESSION_EXPIRED');
  const headers = new Headers(options.headers);
  if (scope === 'admin') headers.set('x-auth-type', 'admin');
  const signal = fenced ? AbortSignal.any([authSignal(fenced), ...(options.signal ? [options.signal] : [])]) : options.signal;
  const request = { ...options, headers, signal };
  const send = async () => {
    try {
      const response = await rawApiFetch(url, request);
      if (fenced && ticket) assertAuth(fenced, ticket.epoch);
      return response;
    } catch (error) {
      if (fenced && ticket && getAuth(fenced).epoch !== ticket.epoch) throw sessionChanged();
      throw error;
    }
  };
  let response = await send();
  if (response.status === 401 && fenced && ticket && retry && !options.signal?.aborted) {
    if (getAuth(fenced).accessVersion === ticket.accessVersion) await refreshSession(fenced, ticket.epoch, ticket.accessVersion);
    assertAuth(fenced, ticket.epoch);
    response = await send(); // Same method/body/key, once; no network retry here.
    if (response.status === 401) {
      const body = await response.arrayBuffer();
      const result = new Response(body, { status: response.status, headers: response.headers });
      expireAuth(fenced, ticket.epoch);
      return result;
    }
  }
  return response;
}
