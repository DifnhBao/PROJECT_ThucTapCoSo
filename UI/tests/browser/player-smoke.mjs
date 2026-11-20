import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import webpackBundle from 'next/dist/compiled/webpack/webpack.js';
import fixtures from '../../../Server/tests/helpers/media-fixtures.cjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ui = path.resolve(__dirname, '../..'), root = path.dirname(ui);
const output = path.join(root, '.local-backups/t10/browser');
const evidence = path.resolve(root, process.env.PLAYER_EVIDENCE_DIR || 'docs/verification/evidence/T10');
const webpack = webpackBundle.webpack;

async function main() {
  await fs.mkdir(output, { recursive: true }); await fs.mkdir(evidence, { recursive: true });
  await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, context: ui, entry: path.join(__dirname, 'player-fixture.tsx'), target: 'web',
    output: { path: output, filename: 'player.js' }, resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs', '.json'], alias: { '@': ui, 'next/navigation$': path.join(__dirname, 'navigation.ts'), 'next/link$': path.join(__dirname, 'link.tsx') } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'ts-loader.cjs') }, { test: /\.css$/, use: path.join(__dirname, 'style-loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE_PATH, 'index.mjs')).href : 'playwright');
  const wav = Buffer.alloc(44 + 160000); fixtures.wav().copy(wav, 0, 0, 44);
  wav.writeUInt32LE(wav.length - 8, 4); wav.writeUInt32LE(wav.length - 44, 40);
  const png = fixtures.png();
  const calls = { pages: [], bad: 0, views: [], activities: [] }; const receipts = new Map(); let mode = 'empty'; const delayed = [];
  const envelope = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ data, meta: { requestId: 'fixture' } })); };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script src="/player.js"></script>'); return; }
    if (url.pathname === '/player.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(await fs.readFile(path.join(output, 'player.js'))); return; }
    if (url.pathname === '/cover.png') { res.setHeader('Content-Type', 'image/png'); res.end(png); return; }
    if (/^\/webfonts\/[a-z0-9-]+\.woff2$/.test(url.pathname)) { res.setHeader('Content-Type', 'font/woff2'); res.end(await fs.readFile(path.join(ui, 'node_modules/@fortawesome/fontawesome-free', url.pathname.slice(1)))); return; }
    if (url.pathname.startsWith('/audio/')) {
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/); const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
      res.writeHead(range ? 206 : 200, { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) }); res.end(wav.subarray(start, end + 1)); return;
    }
    if (url.pathname === '/bad.wav') { calls.bad++; res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('unavailable'); return; }
    if (url.pathname === '/api/songs') {
      calls.pages.push(Number(url.searchParams.get('page')));
      const respond = () => {
        const requested = Number(url.searchParams.get('page'));
        const ids = mode === 'list' ? requested === 1 ? Array.from({ length: 20 }, (_, i) => i + 1) : [21] : [];
        envelope(res, { songs: ids.map((id) => ({ song_id: id, title: `Catalog ${id}`, duration: 10, audio_url: `/audio/${id}.wav`, image_url: '/cover.png', artists: [{ name: 'Fixture' }], genres: [], view_count: 0, is_visible: true })), page: requested, limit: 20, total: mode === 'list' ? 21 : 20 });
      };
      if (mode === 'delay') delayed.push(respond); else respond(); return;
    }
    if (url.pathname === '/api/activity') {
      let body = ''; for await (const chunk of req) body += chunk;
      const event = JSON.parse(body); calls.activities.push(event);
      const duplicate = receipts.has(event.session_id);
      if (!duplicate) receipts.set(event.session_id, String(receipts.size + 1));
      if (process.env.T11_BROWSER_TESTS === 'yes' && event.song_id === 701 && !duplicate) { envelope(res, {}, 500); return; }
      envelope(res, { event_id: event.session_id, activity_id: receipts.get(event.session_id), qualified: false, song_duration: event.song_duration, duplicate }, duplicate ? 200 : 201); return;
    }
    if (/\/view$/.test(url.pathname)) calls.views.push(url.pathname);
    req.resume(); envelope(res, { liked: false, status: 'queued' });
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
    await context.route('**/api/favorites/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: route.request().url().includes('/favorites/me') ? { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } : { liked: false }, meta: { requestId: 'fixture' } }) }));
    const page = await context.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    let offlinePages = 0; page.on('requestfailed', (request) => { if (request.url().includes('/api/songs?')) offlinePages++; });
    await page.addInitScript(() => {
      const Native = window.Audio; window.__audios = [];
      window.Audio = function (...args) { const audio = new Native(...args); window.__audios.push(audio); return audio; }; window.Audio.prototype = Native.prototype;
      const play = HTMLMediaElement.prototype.play;
      window.__playCalls = 0;
      HTMLMediaElement.prototype.play = function () { window.__playCalls++; return window.__rejectPlay ? Promise.reject(new DOMException('fixture blocked', 'NotAllowedError')) : play.call(this); };
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin); await page.getByRole('button', { name: 'Empty', exact: true }).waitFor();
    const state = () => page.getByTestId('state').textContent().then(JSON.parse);
    const wait = (key, value) => page.waitForFunction(({ key, value }) => JSON.parse(document.querySelector('[data-testid=state]').textContent)[key] === value, { key, value });
    await page.waitForTimeout(300); assert.equal(calls.pages.length, 0); assert.equal((await state()).id, null);
    await page.getByRole('button', { name: 'Finite', exact: true }).click(); await wait('playing', true); await wait('id', 101);
    await page.getByRole('button', { name: 'Phát ngẫu nhiên' }).click(); await wait('shuffle', true); assert.equal((await state()).id, 101);
    await page.getByRole('button', { name: 'Phát ngẫu nhiên' }).click(); await wait('shuffle', false); assert.equal((await state()).id, 101);
    assert.equal(calls.pages.length, 0);
    mode = 'delay'; await page.getByRole('button', { name: 'Catalog', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=state]').textContent).loadingMore);
    await page.getByRole('button', { name: 'Finite', exact: true }).click(); for (const send of delayed.splice(0)) send();
    await page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click(); await wait('id', 102); await page.waitForTimeout(200); assert.equal((await state()).id, 102);
    assert.ok(calls.pages.every((page) => page === 2));
    mode = 'empty'; const pageCount = calls.pages.length;
    await page.getByRole('button', { name: 'Catalog', exact: true }).click(); await wait('loadingMore', false); await page.waitForTimeout(400);
    assert.equal(calls.pages.length, pageCount + 1);
    await page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click(); assert.equal((await state()).id, 20); assert.equal(calls.pages.length, pageCount + 1);
    await page.getByRole('button', { name: 'Bad URL', exact: true }).click(); await page.getByRole('alert').waitFor(); assert.equal((await state()).playing, false);
    const beforeBad = calls.bad; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=state]').textContent).error !== null); assert.ok(calls.bad > beforeBad);
    await page.screenshot({ path: path.join(evidence, 'desktop-error.png') });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(evidence, 'mobile-error.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click(); await wait('id', 91); await wait('playing', true);
    assert.equal(calls.views.some((url) => url.includes('/90/')), false);
    await page.evaluate(() => { window.__rejectPlay = true; }); await page.getByRole('button', { name: 'Finite', exact: true }).click(); await page.getByRole('alert').getByText('Trình duyệt chưa cho phép phát.', { exact: false }).waitFor();
    assert.equal((await state()).playing, false); await page.evaluate(() => { window.__rejectPlay = false; }); await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await wait('playing', true);
    await page.getByRole('button', { name: 'Lặp: Tắt', exact: true }).click(); await wait('repeat', 'one');
    const audioCount = await page.evaluate(() => window.__audios.length);
    await page.evaluate(() => { const audio = window.__audios.at(-1); audio.currentTime = audio.duration - .03; });
    await page.waitForFunction((count) => window.__audios.length > count, audioCount); assert.equal((await state()).id, 101);
    await page.getByRole('button', { name: 'Lặp: Một bài', exact: true }).click(); await page.getByRole('button', { name: 'Finite last', exact: true }).click(); await wait('playing', true);
    await page.evaluate(() => { const audio = window.__audios.at(-1); audio.currentTime = audio.duration - .03; }); await wait('id', 101);
    await page.getByRole('button', { name: 'Lặp: Tất cả', exact: true }).click();
    const beforeOffline = offlinePages;
    await context.setOffline(true); await page.getByRole('button', { name: 'Catalog', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=state]').textContent).queueError !== null);
    const failed = offlinePages - beforeOffline; assert.equal(failed, 2); await page.waitForTimeout(500); assert.equal(offlinePages - beforeOffline, failed);
    await context.setOffline(false); await page.getByRole('button', { name: 'Thử tải tiếp', exact: true }).click(); await wait('queueError', null);
    await page.getByRole('button', { name: 'Empty', exact: true }).click(); await wait('id', null);
    mode = 'list'; const listStart = calls.pages.length;
    await page.getByRole('button', { name: 'Catalog list', exact: true }).click(); await page.locator('.list-item').nth(19).waitFor();
    assert.deepEqual(calls.pages.slice(listStart), [1]);
    if (process.env.T18_PERFORMANCE === 'yes') {
      await page.getByRole('button', { name: 'Finite', exact: true }).click(); await wait('playing', true);
      await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click(); await wait('playing', false);
      await page.waitForTimeout(300);
      const samples = [];
      for (let run = 0; run < 3; run++) {
        const before = await page.evaluate(() => Number(document.documentElement.dataset.listCommits || 0));
        for (let i = 0; i < 20; i++) {
          await page.evaluate(t => { const a = window.__audios.at(-1); Object.defineProperty(a, 'currentTime', { configurable: true, value: t }); a.dispatchEvent(new Event('timeupdate')); }, (i + 1) / 10);
          await page.waitForTimeout(20);
        }
        samples.push(await page.evaluate(() => Number(document.documentElement.dataset.listCommits || 0)) - before);
        assert.ok((await page.getByRole('slider', { name: 'Vị trí phát', exact: true }).getAttribute('aria-valuetext')).startsWith('0:02'), 'Progress consumer must still update');
      }
      await fs.writeFile(path.join(evidence, 'profiler.json'), JSON.stringify({ mode: 'React development Profiler, actual TrackSection/provider; synthetic timeupdate, paused audio', eventsPerRun: 20, samples }, null, 2));
      if (process.env.T18_EXPECT_ISOLATED === 'yes') assert.deepEqual(samples, [0,0,0]);
      await page.evaluate(() => { delete window.__audios.at(-1).currentTime; });
      await page.getByRole('button', { name: 'Empty', exact: true }).click(); await wait('id', null);
    }

    await context.setOffline(true);
    await page.locator('.list-container').evaluate((list) => list.dispatchEvent(new Event('scroll', { bubbles: true })));
    await page.getByRole('button', { name: 'Thử tải danh sách', exact: true }).waitFor();
    const listFailures = offlinePages;
    await page.locator('.list-container').evaluate((list) => list.dispatchEvent(new Event('scroll', { bubbles: true })));
    await page.waitForTimeout(200); assert.equal(offlinePages, listFailures);
    await context.setOffline(false); await page.getByRole('button', { name: 'Thử tải danh sách', exact: true }).click();
    await page.locator('.list-item').nth(20).waitFor();
    await page.locator('.list-item').nth(19).getByRole('button').click(); await wait('id', 20); await wait('loadingMore', false);
    await page.getByRole('button', { name: 'Bài tiếp theo', exact: true }).click(); await wait('id', 21);
    assert.deepEqual(calls.pages.slice(listStart), [1, 2]);
    if (process.env.T11_BROWSER_TESTS === 'yes') {
      await page.getByRole('button', { name: 'Search source', exact: true }).click(); await wait('id', 701); await wait('playing', true);
      await page.waitForTimeout(1100);
      await page.getByRole('button', { name: 'Recommendation source', exact: true }).click(); await wait('id', 702); await wait('playing', true);
      await page.waitForTimeout(1100);
      await page.evaluate(() => { const audio = window.__audios.at(-1); audio.currentTime = audio.duration - .03; });
      await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid=state]').textContent).playing === false);
      await page.waitForTimeout(400);
      const a = calls.activities.filter((event) => event.song_id === 701);
      const b = calls.activities.filter((event) => event.song_id === 702);
      assert.equal(a.length, 2); assert.deepEqual(a[0], a[1]); assert.equal(a[0].source, 'search');
      assert.equal(b.length, 1); assert.equal(b[0].source, 'recommendation'); assert.equal(b[0].exit_reason, 'ended');
      assert.ok(b[0].total_listened_time >= .5 && b[0].total_listened_time < 2);
      assert.notEqual(a[0].session_id, b[0].session_id); assert.equal(calls.views.length, 0);
    }
    await page.addInitScript(() => localStorage.setItem('player_state_v3', JSON.stringify({ owner: 1, playlist: [{ trackId: 777, title: 'Restored fixture', duration: 10, audioUrl: '/audio/777.wav', imageUrl: '/cover.png', artistName: 'Fixture' }], index: 0, currentTime: 2, isShuffle: true, repeatMode: 'all', source: 'playlist' })));
    const beforeReloadPages = calls.pages.length;
    await page.reload(); await wait('id', 777); await wait('buffering', false);
    assert.equal((await state()).playing, false); assert.equal((await state()).shuffle, true);
    assert.equal(await page.evaluate(() => window.__playCalls), 0);
    assert.ok(await page.evaluate(() => Math.abs(window.__audios.at(-1).currentTime - 2) < .1));
    assert.equal(calls.pages.length, beforeReloadPages);
    assert.deepEqual(errors, []);
    const result = { browser: 'Chromium/Edge', component: 'actual Player + PlayerProvider + AudioController; Next navigation shim; fixture API', emptyStartupRequests: 0,
      shufflePreservesTrack: true, stalePageDiscarded: true, catalogNextPage: 2, emptyPageStops: true, errorRetrySkip: true, autoplayRejectionRecoverable: true,
      repeatOneAndAllNativeEnded: true, offlinePageAttempts: failed, offlineNoLoop: true, catalogListStrictModePages: [1, 2], catalogListManualRetry: true, restorePausedAtSavedTime: true, failedAudioViewCount: 0, mobileWidth: 390, unexpectedPageErrors: errors, ...(process.env.T11_BROWSER_TESTS === 'yes' ? { listeningSourceSnapshot: true, listeningLostAckSamePayload: true, seekEndActualListenedUnder2Seconds: true, separateViewRequests: calls.views.length } : {}) };
    await fs.writeFile(path.join(evidence, 'browser.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { for (const send of delayed) send(); if (browser) await browser.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
