// Opt-in real-browser check, using an installed Playwright runtime (no app dependency).
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createApp } = require('../../src/app');
const { getSecurityConfig } = require('../../src/config/security');
const listen = async (server) => { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; };
const close = (server) => server && new Promise((resolve) => server.close(resolve));
module.exports = async function browserSecurity() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  let backend, browser, upstream;
  const proxy = http.createServer((req, res) => {
    if (!req.url.startsWith('/api')) {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><title>Same-origin API security fixture</title>');
      return;
    }
    // Mirrors the same-origin /api rewrite; preserve browser-controlled Origin.
    const target = http.request(upstream + req.url, { method: req.method, headers: req.headers }, (response) => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    target.on('error', () => { res.statusCode = 502; res.end(); });
    req.pipe(target);
  });
  const attacker = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Other-origin fixture</title>'); });
  try {
    const origin = await listen(proxy), evil = await listen(attacker);
    backend = createApp({ securityConfig: getSecurityConfig({ ...process.env, WEB_ORIGINS: origin }) });
    const backendServer = http.createServer(backend);
    backend = backendServer;
    upstream = await listen(backendServer);
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin);
    const login = await page.evaluate(async (password) => {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo_userA', password }) });
      return response.status;
    }, process.env.TEST_SEED_PASSWORD);
    assert.equal(login, 200);
    const before = await context.cookies(origin);
    assert.ok(before.some((cookie) => cookie.name === 'refreshToken' && cookie.httpOnly && cookie.sameSite === 'Lax' && cookie.path === '/'));
    assert.equal(await page.evaluate(() => document.cookie), '');
    const originalRefresh = before.find((cookie) => cookie.name === 'refreshToken').value;
    assert.equal(await page.evaluate(async () => (await fetch('/api/auth/refresh-token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status), 200);
    assert.ok((await context.cookies(origin)).find((cookie) => cookie.name === 'refreshToken').value !== originalRefresh);
    assert.equal(await page.evaluate(async () => (await fetch('/api/users/me', { credentials: 'include' })).status), 200);
    // A different port is same-site, so Lax cookies ARE sent. Origin validation
    // must block this request before logout, even without preflight.
    await page.goto(evil);
    let attackCookiePresent = false, attackStatus;
    proxy.on('request', (req, res) => {
      if (req.headers.origin === evil && req.url === '/api/auth/logout') {
        attackCookiePresent = Boolean(req.headers.cookie?.includes('refreshToken='));
        res.on('finish', () => { attackStatus = res.statusCode; });
      }
    });
    await page.evaluate(async (target) => {
      try { await fetch(target + '/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' }); } catch { /* CORS hides the rejected response from attacker JS. */ }
    }, origin);
    assert.equal(attackCookiePresent, true);
    assert.equal(attackStatus, 403);
    await page.goto(origin);
    assert.equal(await page.evaluate(async () => (await fetch('/api/users/me', { credentials: 'include' })).status), 200);
    let uploadPlayback;
    if (process.env.T08_BROWSER_UPLOAD === 'yes') {
      uploadPlayback = await page.evaluate(async ({ bytes, password }) => {
        const form = new FormData();
        form.set('title', 'Browser fixture'); form.set('audioFile', new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }), 'fixture.wav');
        const result = await fetch('/api/songs/upload', { method: 'POST', credentials: 'include', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: form });
        const song = (await result.json()).data.data;
        const pendingStatus = (await fetch(song.audio_url, { credentials: 'include' })).status;
        const login = await fetch('/api/auth/admin/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo_admin', password }) });
        const audio = new Audio(song.audio_url);
        const canReadMetadata = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(false), 5000);
          audio.onloadedmetadata = () => { clearTimeout(timer); resolve(Number.isFinite(audio.duration)); };
          audio.onerror = () => { clearTimeout(timer); resolve(false); };
          audio.load();
        });
        audio.removeAttribute('src'); audio.load();
        return { upload: result.status, pendingOwnerRead: pendingStatus, adminLogin: login.status, audioMetadataLoaded: canReadMetadata };
      }, { bytes: [...require('../helpers/media-fixtures.cjs').wav()], password: process.env.TEST_SEED_PASSWORD });
      assert.deepEqual(uploadPlayback, { upload: 201, pendingOwnerRead: 404, adminLogin: 200, audioMetadataLoaded: true });
    }
    assert.equal(await page.evaluate(async () => (await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })).status), 200);
    assert.equal((await context.cookies(origin)).filter((cookie) => /^(accessToken|refreshToken)$/.test(cookie.name)).length, 0);
    return { browser: 'Chromium/Edge', topology: 'same-origin /api reverse-proxy fixture', login: 200, refresh: 200, authenticatedRead: 200, hostileMutationWithRealCookie: 403, sessionPreservedAfterAttack: true, logout: 200, httpOnly: true, sameSite: 'Lax', ...(uploadPlayback ? { uploadPlayback } : {}) };
  } finally {
    if (browser) await browser.close();
    await close(backend); await close(proxy); await close(attacker);
  }
};
