const { createHash } = require('node:crypto');
const { AppError } = require('../utils/app-error');

function createSecurity(config, now = Date.now) {
  const store = new Map();
  let rebuildInFlight = false;
  function reject(req, res, next, code, status, retryAfter) {
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    res.set('Cache-Control', 'no-store');
    // Never log raw IP, username, URL/query, body or credential.
    console.warn(JSON.stringify({ event: 'security_rejected', code, requestId: req.requestId }));
    return next(new AppError(status === 429 ? `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.` : 'Yêu cầu không được phép.', status, code));
  }
  function spend(req, res, next, name, identity) {
    const time = now(), rule = config[name], key = `${name}:${identity}`;
    let entry = store.get(key);
    if (!entry || time >= entry.until) {
      if (!entry && store.size >= config.maxEntries) {
        for (const [candidate, value] of store) if (value.until <= time) store.delete(candidate);
        if (store.size >= config.maxEntries) return reject(req, res, next, 'RATE_STORE_FULL', 429, 60);
      }
      entry = { count: 0, until: time + rule.windowMs };
      store.set(key, entry);
    }
    if (entry.count >= rule.max) return reject(req, res, next, 'RATE_LIMITED', 429, Math.max(1, Math.ceil((entry.until - time) / 1000)));
    entry.count++;
    return false;
  }
  const hashed = (input) => createHash('sha256').update(String(input)).digest('hex');
  // Aggregate native IPv6 clients by /64, preventing trivial address rotation.
  const ipKey = (ip) => {
    const value = String(ip || 'unknown').replace(/^::ffff:/, '');
    if (!value.includes(':')) return hashed(value);
    const u = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    const [left, right = ''] = u.split('::');
    const a = left ? left.split(':') : [], b = right ? right.split(':') : [];
    const parts = u.includes('::') ? [...a, ...Array(8 - a.length - b.length).fill('0'), ...b] : a;
    return hashed(parts.slice(0, 4).map((p) => parseInt(p, 16).toString(16)).join(':'));
  };
  const limit = (name, key) => (req, res, next) => {
    const identity = key ? key(req) : ipKey(req.ip);
    if (spend(req, res, next, name, identity) === false) next();
  };
  const early = (req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'", 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
    if (!req.path.toLowerCase().startsWith('/api')) return next();
    if (spend(req, res, next, 'api', ipKey(req.ip)) !== false) return;
    const origin = req.get('Origin');
    if (origin && !config.origins.includes(origin)) return reject(req, res, next, 'ORIGIN_FORBIDDEN', 403);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Require a browser-controlled Origin for every mutation, including login/logout.
      // Do not derive trusted origins from Host/X-Forwarded-* or accept missing/null.
      if (!origin) return reject(req, res, next, 'ORIGIN_REQUIRED', 403);
      if (req.get('Sec-Fetch-Site') === 'cross-site') return reject(req, res, next, 'CSRF_FORBIDDEN', 403);
    }
    if (Number(req.get('Content-Length')) > config.uploadMaxBytes) return next(new AppError('Request quá lớn.', 413, 'PAYLOAD_TOO_LARGE'));
    next();
  };
  const loginAccount = limit('loginAccount', (req) => hashed(typeof req.body?.username === 'string' ? req.body.username.trim().normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().slice(0, 100) : '<missing>'));
  const upload = (req, res, next) => {
    if (Number(req.get('Content-Length')) > config.uploadMaxBytes) return next(new AppError('Upload quá lớn.', 413, 'PAYLOAD_TOO_LARGE'));
    return limit('upload', (r) => String(r.auth.userId))(req, res, next);
  };
  const rebuild = (req, res, next) => {
    if (rebuildInFlight) return reject(req, res, next, 'REBUILD_BUSY', 429, 5);
    if (spend(req, res, next, 'rebuild', 'global') !== false) return;
    rebuildInFlight = true;
    let released = false;
    const release = () => { if (!released) { released = true; rebuildInFlight = false; } };
    // Release from the controller finally, not socket close: work may outlive disconnect.
    req.releaseRebuild = release;
    next();
  };
  return { early, limit, loginIp: limit('loginIp'), loginAccount, register: limit('register'), refresh: limit('refresh'), upload, activity: limit('activity', (req) => String(req.auth.userId)), recommendation: limit('recommendation'), rebuild };
}
// Routers are cached between app factories; resolve state from the request's own app.
const guard = (name) => (req, res, next) => req.app.locals.security[name](req, res, next);
module.exports = { createSecurity, guard };
