const net = require('node:net');
const { ConfigurationError } = require('./env');
function positive(env, name, fallback, max = 1000000) {
  const value = env[name] ?? fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) throw new ConfigurationError(`Invalid configuration: ${name}`);
  return Number(value);
}
function getSecurityConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const origins = (env.WEB_ORIGINS || (production ? '' : 'http://localhost:3000,http://127.0.0.1:3000')).split(',').map((s) => s.trim());
  if (!origins.length || origins.some((origin) => {
    try { const u = new URL(origin); return u.origin !== origin || !['http:', 'https:'].includes(u.protocol) || (production && u.protocol !== 'https:'); }
    catch { return true; }
  })) throw new ConfigurationError('Invalid configuration: WEB_ORIGINS');
  // Only explicit IP/CIDR allowlists; no blanket boolean, hop count or broad alias.
  const proxies = (env.TRUSTED_PROXY_CIDRS || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const entry of proxies) {
    const [ip, prefix, ...rest] = entry.split('/');
    const version = net.isIP(ip);
    if (!version || rest.length || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > (version === 4 ? 32 : 128) || Number(prefix) === 0))) throw new ConfigurationError('Invalid configuration: TRUSTED_PROXY_CIDRS');
  }
  const quota = (name, max, windowMs) => ({ max: positive(env, `${name}_MAX`, max), windowMs: positive(env, `${name}_WINDOW_MS`, windowMs, 86400000) });
  return Object.freeze({
    origins, proxies, production,
    api: quota('RATE_API', 600, 60000),
    loginIp: quota('RATE_LOGIN_IP', 20, 900000),
    loginAccount: quota('RATE_LOGIN_ACCOUNT', 10, 900000),
    register: quota('RATE_REGISTER', 10, 3600000),
    refresh: quota('RATE_REFRESH', 60, 60000),
    upload: quota('RATE_UPLOAD', 5, 3600000),
    activity: quota('RATE_ACTIVITY', 120, 60000),
    recommendation: quota('RATE_RECOMMENDATION', 60, 60000),
    rebuild: quota('RATE_REBUILD', 1, 300000),
    maxEntries: positive(env, 'RATE_STORE_MAX_ENTRIES', 10000, 100000),
    uploadMaxBytes: positive(env, 'UPLOAD_REQUEST_MAX_BYTES', 22 * 1024 * 1024, 22 * 1024 * 1024),
    activityMaxBytes: positive(env, 'ACTIVITY_BODY_MAX_BYTES', 8192, 102400),
    recommendationCandidates: positive(env, 'RECOMMENDATION_CANDIDATE_MAX', 100, 500),
    rebuildMax: positive(env, 'REBUILD_SONG_MAX', 100, 100),
  });
}
function cookieOptions(env = process.env) {
  return { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
}
module.exports = { getSecurityConfig, cookieOptions };
