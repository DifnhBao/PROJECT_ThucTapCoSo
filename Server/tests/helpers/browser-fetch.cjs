// Existing API suites simulate same-origin browser mutations. CSRF policy suites
// deliberately use native fetch so absent/hostile Origin is tested unchanged.
module.exports = (url, options = {}) => {
  const headers = new Headers(options.headers);
  if (!headers.has('Origin') && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    headers.set('Origin', (process.env.WEB_ORIGINS || 'http://localhost:3000').split(',')[0]);
  }
  return globalThis.fetch(url, { ...options, headers });
};
