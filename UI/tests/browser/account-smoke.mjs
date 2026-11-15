import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import webpackBundle from 'next/dist/compiled/webpack/webpack.js';
import fixtures from '../../../Server/tests/helpers/media-fixtures.cjs';
const directory = path.dirname(fileURLToPath(import.meta.url)), ui = path.resolve(directory, '../..'), root = path.dirname(ui);
const output = path.join(root, '.local-backups/t12/browser'), evidence = path.resolve(root, process.env.ACCOUNT_EVIDENCE_DIR || 'docs/verification/evidence/T12');
async function main() {
  await fs.mkdir(output, { recursive: true }); await fs.mkdir(evidence, { recursive: true });
  await new Promise((resolve, reject) => webpackBundle.webpack({ mode: 'development', devtool: false, context: ui, entry: path.join(directory, 'account-fixture.tsx'), target: 'web', output: { path: output, filename: 'accounts.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs', '.json'], alias: { '@': ui, 'next/navigation$': path.join(directory, 'navigation.ts'), 'next/link$': path.join(directory, 'link.tsx') } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(directory, 'ts-loader.cjs') }, { test: /\.css$/, use: path.join(directory, 'style-loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href : 'playwright');
  const calls = { userRefresh: 0, adminRefresh: 0, probes: [], pages: [], statusReads: [], toggles: 0, activities: [], updates: [], uploads: [], details: [] };
  const expired = { user: false, admin: false }; let rejectRefresh = false, failLike = false, loseLikeResponse = false, delayStatus = false, delayPlaylists = false, delayLike = false, failPage2 = false;
  const delayed = [], held = [], oldDetails = []; let holdRefresh = false;
  const favorites = { 1: [...Array.from({ length: 40 }, (_, i) => i + 1), 99], 2: [201, 202] };
  const wav = Buffer.alloc(44 + 160000); fixtures.wav().copy(wav, 0, 0, 44); wav.writeUInt32LE(wav.length - 8, 4); wav.writeUInt32LE(wav.length - 44, 40);
  const success = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ data, meta: { requestId: 'fixture' } })); };
  const failure = (res, status = 401) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { code: status === 401 ? 'INVALID_SESSION' : 'INTERNAL_ERROR', message: 'Fixture failure', details: [] }, requestId: 'fixture' })); };
  const song = (id, user) => ({ song_id: id, title: `${user === 1 ? 'A' : 'B'} song ${id}`, duration: 10, audio_url: `/audio/${id}.wav`, image_url: '/cover.png', artists: [{ name: 'Fixture' }], is_visible: true });
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script src="/accounts.js"></script>'); return; }
    if (url.pathname === '/accounts.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(await fs.readFile(path.join(output, 'accounts.js'))); return; }
    if (url.pathname === '/cover.png') { res.setHeader('Content-Type', 'image/png'); res.end(fixtures.png()); return; }
    if (url.pathname.startsWith('/audio/')) { res.setHeader('Content-Type', 'audio/wav'); res.end(wav); return; }
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split('=')));
    const user = Number(cookies.accessToken), admin = Number(cookies.accessToken_admin);
    const scope = req.headers['x-auth-type'] === 'admin' ? 'admin' : 'user';
    let body = ''; for await (const chunk of req) body += chunk;
    if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/admin/login') {
      const payload = JSON.parse(body); const isAdmin = url.pathname.includes('/admin/'), id = isAdmin ? 3 : payload.username === 'A' ? 1 : 2;
      res.setHeader('Set-Cookie', `${isAdmin ? 'accessToken_admin' : 'accessToken'}=${id}; HttpOnly; SameSite=Lax; Path=/`);
      success(res, isAdmin ? { admin: { user_id: id, username: 'Admin', role: 'admin' } } : { data: { user: { user_id: id, username: id === 1 ? 'A' : 'B', role: 'user' } } }); return;
    }
    if (url.pathname === '/api/auth/logout') { res.setHeader('Set-Cookie', 'accessToken=; Max-Age=0; Path=/'); success(res, {}); return; }
    if (url.pathname.endsWith('/refresh-token')) {
      const isAdmin = url.pathname.includes('/admin/'); if (isAdmin) calls.adminRefresh++; else calls.userRefresh++;
      const respond = () => { if (!(isAdmin ? admin : user) || (!isAdmin && rejectRefresh)) failure(res); else { expired[isAdmin ? 'admin' : 'user'] = false; success(res, {}); } };
      if (holdRefresh) held.push(respond); else respond(); return;
    }
    if (url.pathname === '/api/users/me') { if (user) success(res, { data: { user_id: user, username: user === 1 ? 'A' : 'B', role: 'user' } }); else failure(res); return; }
    if (url.pathname === '/api/users/admin/me') { if (admin) success(res, { data: { user_id: admin, username: 'Admin', role: 'admin' } }); else failure(res); return; }
    if (url.pathname === '/api/private-probe') { calls.probes.push(scope); if (!(scope === 'admin' ? admin : user) || expired[scope]) failure(res); else success(res, { scope }); return; }
    if (url.pathname === '/api/users') { if (!admin) failure(res); else success(res, { data: [{ user_id: 1, username: 'Private admin list', role: 'user' }] }); return; }
    if (/^\/api\/songs\/\d+$/.test(url.pathname) && req.method === 'PUT') { calls.updates.push(JSON.parse(body)); success(res, { data: { song_id: Number(url.pathname.split('/').at(-1)), ...JSON.parse(body), audio_url: '/audio/fixture.wav' } }); return; }
    if (url.pathname === '/api/songs' && req.method === 'POST') { calls.uploads.push({ body, key: req.headers['idempotency-key'], type: req.headers['content-type'] }); success(res, { data: song(503, user), message: 'Uploaded fixture' }, 201); return; }
    if (/^\/api\/playlists\/[12]$/.test(url.pathname)) { const id = Number(url.pathname.split('/').at(-1)); calls.details.push(id); const respond = () => success(res, { data: { playlist_id: id, user_id: user, name: `Detail fixture ${id}`, is_public: false, songs: [] } }); if (id === 1) oldDetails.push(respond); else respond(); return; }
    if (!user) { failure(res); return; }
    if (url.pathname === '/api/favorites/me') {
      const page = Number(url.searchParams.get('page')); calls.pages.push({ user, page });
      if (page === 2 && failPage2) { failPage2 = false; failure(res, 500); return; }
      success(res, { data: favorites[user].slice((page - 1) * 20, page * 20).map((id) => ({ song: song(id, user) })), pagination: { page, limit: 20, total: favorites[user].length, totalPages: Math.ceil(favorites[user].length / 20) } }); return;
    }
    const status = url.pathname.match(/^\/api\/favorites\/(\d+)\/like-status$/);
    if (status) { calls.statusReads.push(Number(status[1])); const respond = () => success(res, { liked: favorites[user].includes(Number(status[1])) }); if (user === 1 && Number(status[1]) === 39 && delayStatus) delayed.push(respond); else respond(); return; }
    const like = url.pathname.match(/^\/api\/favorites\/(\d+)\/like$/);
    if (like) {
      calls.toggles++; if (user === 1 && delayLike) { delayed.push(() => failure(res, 500)); return; } if (failLike) { failure(res, 500); return; }
      const id = Number(like[1]), liked = !favorites[user].includes(id); favorites[user] = liked ? [id, ...favorites[user]] : favorites[user].filter((value) => value !== id); if (loseLikeResponse) failure(res, 500); else success(res, { liked }); return;
    }
    if (url.pathname === '/api/playlists/me') { const respond = () => success(res, { data: [{ playlist_id: user, name: `${user === 1 ? 'A' : 'B'} private playlist`, user_id: user, is_public: false }] }); if (user === 1 && delayPlaylists) delayed.push(respond); else respond(); return; }
    if (url.pathname === '/api/activity') { const event = JSON.parse(body); calls.activities.push({ user, event }); success(res, { event_id: event.session_id, activity_id: String(calls.activities.length) }, 201); return; }
    failure(res, 404);
  }).listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage(); const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const wait = (target, key, value) => target.waitForFunction(({ key, value }) => JSON.parse(document.querySelector('[data-testid=account]').textContent)[key] === value, { key, value });
    const likes = () => page.getByTestId('likes').textContent().then(JSON.parse);
    await page.goto(origin); await wait(page, 'userStatus', 'expired'); await wait(page, 'adminStatus', 'expired');
    await page.getByRole('button', { name: 'Login A', exact: true }).click(); await wait(page, 'user', 1); await page.locator('#table_row .row').nth(19).waitFor();
    await page.getByRole('button', { name: 'Check99', exact: true }).click(); await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=likes]').textContent)['99'] === true);
    failPage2 = true; await page.getByRole('button', { name: 'Tải thêm bài hát', exact: true }).click(); await page.getByRole('button', { name: 'Thử tải lại thư viện', exact: true }).waitFor();
    assert.equal(await page.locator('#table_row .row').count(), 20); assert.equal((await likes())[99], true);
    await page.getByRole('button', { name: 'Thử tải lại thư viện', exact: true }).click(); await page.locator('#table_row .row').nth(39).waitFor();
    await page.getByRole('button', { name: 'Tải thêm bài hát', exact: true }).click(); await page.locator('#table_row .row').nth(40).waitFor(); assert.equal(await page.locator('#table_row .row').count(), 41); assert.equal((await likes())[99], true);
    failLike = true; const toggleStart = calls.toggles; await page.getByRole('button', { name: 'Bỏ yêu thích A song 1', exact: true }).click(); await page.getByRole('alert').getByText('Không cập nhật được yêu thích.', { exact: false }).waitFor();
    assert.equal((await likes())[1], true); assert.equal(calls.toggles, toggleStart + 1); failLike = false;
    await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).click();
    loseLikeResponse = true; const beforeLost = calls.toggles;
    await page.getByRole('button', { name: 'Bỏ yêu thích A song 3', exact: true }).click(); await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).waitFor();
    for (let i = 0; i < 200 && !calls.statusReads.includes(3); i++) await new Promise((resolve) => setTimeout(resolve, 20)); assert.ok(calls.statusReads.includes(3));
    await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=likes]').textContent)['3'] === false);
    assert.equal(calls.toggles, beforeLost + 1); loseLikeResponse = false; await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ yêu thích A song 99', exact: true }).click(); await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=likes]').textContent)['99'] === false); assert.equal(calls.toggles, toggleStart + 3);
    await page.getByRole('button', { name: 'Login admin', exact: true }).click(); await wait(page, 'admin', 3); await page.getByTestId('admin-cache').getByText('Private admin list', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Queue song', exact: true }).click(); await page.getByTestId('playback').getByText('playing', { exact: true }).waitFor(); await page.waitForTimeout(800);
    const refreshBefore = { user: calls.userRefresh, admin: calls.adminRefresh }; expired.user = true; expired.admin = true; holdRefresh = true;
    await page.getByRole('button', { name: 'Concurrent probes', exact: true }).click();
    for (let i = 0; i < 200 && held.length < 2; i++) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(held.length, 2); holdRefresh = false; held.splice(0).forEach((respond) => respond()); await wait(page, 'result', 'ok');
    assert.equal(calls.userRefresh - refreshBefore.user, 1); assert.equal(calls.adminRefresh - refreshBefore.admin, 1);
    await page.getByRole('button', { name: 'Queue song', exact: true }).click();
    for (let i = 0; i < 200 && !calls.activities.some((item) => item.user === 1 && item.event.song_id === 1); i++) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(calls.activities.some((item) => item.user === 1 && item.event.song_id === 1 && item.event.total_listened_time >= .3));
    if (process.env.T13_BROWSER_TESTS === 'yes') {
      await page.getByRole('button', { name: 'Edit fixture one', exact: true }).click();
      assert.equal(await page.getByPlaceholder('Song Title', { exact: true }).inputValue(), 'Edit fixture one');
      assert.equal(await page.getByPlaceholder('Artists (e.g. artist1, artist2, artist3)', { exact: true }).inputValue(), 'Artist one');
      await page.getByRole('button', { name: 'Edit fixture two', exact: true }).evaluate((button) => button.click());
      assert.equal(await page.getByPlaceholder('Song Title', { exact: true }).inputValue(), 'Edit fixture two');
      await page.getByPlaceholder('Song Title', { exact: true }).fill('Edited fixture');
      await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByPlaceholder('Song Title', { exact: true }).waitFor({ state: 'detached' });
      assert.deepEqual(calls.updates.at(-1), { title: 'Edited fixture', artist: 'Artist two', genre: 'Jazz', duration: 90 });
      await page.getByRole('button', { name: 'New fixture song', exact: true }).click(); assert.equal(await page.getByPlaceholder('Song Title', { exact: true }).inputValue(), '');
      await page.getByPlaceholder('Song Title', { exact: true }).fill('Added fixture');
      await page.locator('input[type=file][accept="audio/*"]').setInputFiles({ name: 'fixture.wav', mimeType: 'audio/wav', buffer: wav });
      await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByPlaceholder('Song Title', { exact: true }).waitFor({ state: 'detached' });
      assert.equal(calls.uploads.length, 1); assert.ok(calls.uploads[0].key); assert.ok(calls.uploads[0].body.includes('Added fixture')); assert.match(calls.uploads[0].type, /boundary=/);
      await page.getByRole('button', { name: 'Detail one', exact: true }).click();
      for (let i = 0; i < 200 && oldDetails.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 20)); assert.equal(oldDetails.length, 1);
      await page.getByRole('button', { name: 'Detail two', exact: true }).click(); await page.getByTestId('playlist-detail').getByText('Detail fixture 2', { exact: true }).waitFor();
      oldDetails.splice(0).forEach((respond) => respond()); await page.waitForTimeout(200);
      assert.equal(await page.getByTestId('playlist-detail').textContent(), 'Detail fixture 2'); assert.deepEqual(calls.details, [1, 2]);
    }
    // Fetch A status and playlist responses across account switch. Native abort
    // is allowed; the server intentionally still completes its old response.
    await page.getByRole('button', { name: 'Login A', exact: true }).click(); await wait(page, 'user', 1); await page.locator('#table_row .row').nth(19).waitFor();
    delayStatus = true; delayPlaylists = true;
    await page.getByRole('button', { name: 'Check39', exact: true }).click(); await page.getByRole('button', { name: 'Reload playlists', exact: true }).click();
    for (let i = 0; i < 200 && delayed.length < 2; i++) await new Promise((resolve) => setTimeout(resolve, 20)); assert.equal(delayed.length, 2);
    delayLike = true; await page.getByRole('button', { name: 'Bỏ yêu thích A song 2', exact: true }).click();
    for (let i = 0; i < 200 && delayed.length < 3; i++) await new Promise((resolve) => setTimeout(resolve, 20)); assert.equal(delayed.length, 3);
    await page.getByRole('button', { name: 'Queue song', exact: true }).click(); await page.getByTestId('queue').getByText('1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Open private modal', exact: true }).click(); assert.ok((await page.getByTestId('modal-data').textContent()).includes('A-private-modal'));
    // Account changes can originate outside an open modal (e.g. another tab).
    await page.getByRole('button', { name: 'Login B', exact: true }).evaluate((button) => button.click()); await wait(page, 'user', 2); delayed.splice(0).forEach((respond) => respond());
    assert.equal(await page.getByTestId('modal-data').textContent(), 'null');
    await page.getByText('B song 201', { exact: true }).waitFor(); await page.getByTestId('playlists').getByText('B private playlist', { exact: true }).waitFor();
    assert.equal(await page.getByText('A song 1', { exact: true }).count(), 0); assert.equal((await likes())[39], undefined); assert.equal((await likes())[99], undefined); assert.equal((await likes())[2], undefined); assert.equal(await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).count(), 0); assert.equal(await page.getByTestId('queue').textContent(), 'empty');
    assert.equal(await page.evaluate(() => localStorage.getItem('player_state_v3')), null); assert.equal((await page.getByTestId('account').textContent().then(JSON.parse)).admin, 3);
    rejectRefresh = true; expired.user = true; const beforeFail = calls.userRefresh;
    await page.getByRole('button', { name: 'User probe', exact: true }).click(); await wait(page, 'userStatus', 'expired'); await wait(page, 'result', 'failed');
    await page.getByRole('button', { name: 'User probe', exact: true }).click(); await wait(page, 'result', 'failed'); assert.equal(calls.userRefresh, beforeFail + 1); assert.equal(await page.locator('#table_row .row').count(), 0);
    rejectRefresh = false; expired.user = false; await page.getByRole('button', { name: 'Login A', exact: true }).click(); await wait(page, 'user', 1);
    const second = await context.newPage(); second.on('pageerror', (error) => errors.push(error.message)); await second.goto(origin); await wait(second, 'user', 1); await second.getByText('A song 1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Logout user', exact: true }).click(); await wait(page, 'user', null); await wait(second, 'user', null); assert.equal(await second.getByText('A song 1', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Login B', exact: true }).click(); await wait(page, 'user', 2); await wait(second, 'user', 2); await second.getByText('B song 201', { exact: true }).waitFor();
    assert.deepEqual(errors, []); await page.screenshot({ path: path.join(evidence, 'library-account-b.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(evidence, 'library-mobile.png'), fullPage: true });
    const result = { browser: 'Chromium/Edge', fixtureApi: true, actualProvidersAndTransport: true, library41SongsAcross3Pages: true, pageFailureManualRetry: true, statusOutsidePagePreserved: true, optimisticRollbackToast: true, lostToggleResponseReconciledWithoutPostReplay: true, failedToggleRequests: 1, concurrentRefreshPerScope: { user: 1, admin: 1 }, listeningSessionSurvivesRefresh: true, staleAccountResponsesDiscarded: true, staleMutationRollbackCannotAffectB: true, privateQueueCleared: true, refreshFailureExpiresWithoutLoop: true, adminSurvivesUserSwitch: true, crossTabLogoutAndLogin: true, unexpectedPageErrors: errors, ...(process.env.T13_BROWSER_TESTS === 'yes' ? { adminFormInitialValuesAndReset: true, typedMetadataSaveAndMultipartUpload: true, playlistDetailStaleResponseDiscarded: true } : {}) };
    await fs.writeFile(path.join(evidence, 'browser-accounts.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { oldDetails.forEach((respond) => respond()); delayed.forEach((respond) => respond()); held.forEach((respond) => respond()); if (browser) await browser.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
