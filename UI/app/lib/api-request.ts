export const API_BASE = '/api';
export function apiUrl(value: string): string {
  if (/^https?:\/\//.test(value)) {
    if (typeof window !== 'undefined' && new URL(value).origin !== window.location.origin) throw new Error('API phải cùng origin.');
    return value;
  }
  return value.startsWith('/api/') || value === API_BASE ? value : API_BASE + '/' + value.replace(/^\/+/, '');
}
// Only this module performs ordinary native fetch; transports share URL/cookies.
export const rawApiFetch = (url: string, options: RequestInit = {}) => fetch(apiUrl(url), {
  ...options, credentials: 'include', cache: 'no-store',
  signal: AbortSignal.any([AbortSignal.timeout(15000), ...(options.signal ? [options.signal] : [])]),
});
