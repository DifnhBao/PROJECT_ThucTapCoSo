export const API_BASE = '/api';
export function apiUrl(value: string): string {
  if (/^https?:\/\//.test(value)) {
    if (typeof window !== 'undefined' && new URL(value).origin !== window.location.origin) throw new Error('API phải cùng origin.');
    return value;
  }
  return value.startsWith('/api/') || value === API_BASE ? value : API_BASE + '/' + value.replace(/^\/+/, '');
}
// Only this module performs ordinary native fetch; transports share URL/cookies.
export const rawApiFetch = (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const emptyMutation = /^(POST|PUT|PATCH|DELETE)$/i.test(options.method || 'GET')
    && options.body == null && !headers.has('Content-Type');
  // An empty chunked request can acquire body framing at a reverse proxy. Send
  // explicit JSON for empty mutations; leave multipart and caller bodies intact.
  if (emptyMutation) headers.set('Content-Type', 'application/json');
  return fetch(apiUrl(url), {
    ...options, headers, ...(emptyMutation ? { body: '{}' } : {}), credentials: 'include', cache: 'no-store',
    signal: AbortSignal.any([AbortSignal.timeout(15000), ...(options.signal ? [options.signal] : [])]),
  });
};
