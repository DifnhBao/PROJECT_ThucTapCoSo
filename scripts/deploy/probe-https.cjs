// Small real-endpoint probe. It does not replace browser/moderation/operations acceptance.
const fs = require('node:fs');
const path = require('node:path');
function targetOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw Error('INVALID_HTTPS_ORIGIN'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[::1\])/i.test(url.hostname)
    || /\.localhost$/i.test(url.hostname)) throw Error('INVALID_HTTPS_ORIGIN');
  return url.origin;
}
async function probe(env = process.env, transport = fetch) {
  const origin = targetOrigin(env.SMOKE_URL);
  const checks = [], jar = new Map();
  const authenticated = Boolean(env.SMOKE_USERNAME || env.SMOKE_PASSWORD);
  if (authenticated && (!env.SMOKE_USERNAME || !env.SMOKE_PASSWORD || env.SMOKE_ALLOW_SESSION_MUTATIONS !== 'yes')) throw Error('SESSION_OPT_IN_REQUIRED');
  async function request(stage, route, expected, body) {
    const response = await transport(origin + route, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(jar.size ? { Cookie: [...jar].map(([k,v]) => k + '=' + v).join('; ') } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status !== expected) throw Error('UNEXPECTED_STATUS_' + stage);
    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      const pair = cookie.split(';',1)[0], index = pair.indexOf('='), key = pair.slice(0,index), value = pair.slice(index+1);
      if (!['accessToken','refreshToken'].includes(key)) continue;
      if (!/;\s*secure(?:;|$)/i.test(cookie) || !/;\s*httponly(?:;|$)/i.test(cookie)
        || !/;\s*samesite=lax(?:;|$)/i.test(cookie)) throw Error('UNSAFE_COOKIE_' + stage);
      if (value) jar.set(key,value); else jar.delete(key);
    }
    checks.push({ stage, status: response.status });
    await response.body?.cancel();
  }
  await request('live','/health/live',200);
  await request('ready','/health/ready',200);
  await request('login-page','/login',200);
  await request('public-catalog','/api/songs?page=1&limit=1',200);
  if (authenticated) {
    try {
      await request('login','/api/auth/login',200,{username:env.SMOKE_USERNAME,password:env.SMOKE_PASSWORD});
      if (!jar.has('accessToken') || !jar.has('refreshToken')) throw Error('LOGIN_COOKIES_MISSING');
      await request('profile','/api/users/me',200);
      await request('user-cannot-read-admin','/api/songs/pending',403);
      await request('refresh','/api/auth/refresh-token',200,{});
    } finally {
      if (jar.has('refreshToken')) await request('logout','/api/auth/logout',200,{});
    }
    await request('logged-out-profile','/api/users/me',401);
  }
  return { status:'PASS', scope:'HTTPS HTTP probe only', origin, checks, sessionChecks:authenticated?'PASS':'NOT_RUN',
    t23Acceptance:'NOT_VERIFIED_BY_THIS_PROBE', remaining:['real browser cookies/audio','moderation/provider','restart/readiness/backup/rollback','release SHA provenance'] };
}
if (require.main === module) {
  probe().then(result => {
    const dir=path.resolve(__dirname,'../../docs/verification/evidence/T23');fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'https-probe.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  }).catch(() => { console.error('FAIL HTTPS probe; check target, health and session configuration. No credentials or response bodies logged.');process.exitCode=1; });
}
module.exports={targetOrigin,probe};
