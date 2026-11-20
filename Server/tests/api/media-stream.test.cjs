const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const cloud = require('cloudinary').v2;
const { createApp } = require('../../src/app');
const { MediaAsset, Song } = require('../../src/models');
const storage = require('../../src/storage/cloudinary');

async function listen(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function proxy(t, upstream) {
  const url = await listen(t, http.createServer(upstream));
  t.mock.method(cloud.utils, 'private_download_url', () => url);
  const read = storage.read;
  t.mock.method(storage, 'read', (asset, range, options) =>
    read(asset, range, { ...options, headerTimeoutMs: 200 }));
  t.mock.method(MediaAsset, 'findByPk', async () => ({ state: 'owned', song_id: 1, format: 'mp3' }));
  t.mock.method(Song, 'findByPk', async () => ({ status: 'approved', is_visible: true }));
  const base = await listen(t, http.createServer(createApp()));
  return base + '/api/media/00000000-0000-0000-0000-000000000001';
}

test('missing upstream headers time out and release the upstream connection', { timeout: 5000 }, async (t) => {
  const closed = Promise.withResolvers();
  const url = await proxy(t, (_req, res) => res.once('close', closed.resolve));
  const response = await fetch(url);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'MEDIA_UNAVAILABLE');
  await closed.promise;
});

test('chunked audio completes after the header deadline', async (t) => {
  const url = await proxy(t, (_req, res) => {
    res.write('first');
    const timer = setTimeout(() => res.end('last'), 400);
    res.once('close', () => clearTimeout(timer));
  });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(await response.text(), 'firstlast');
});

test('seeking forwards Range and preserves the partial response', async (t) => {
  let range;
  const url = await proxy(t, (req, res) => {
    range = req.headers.range;
    res.writeHead(206, { 'Content-Range': 'bytes 2-4/8', 'Accept-Ranges': 'bytes', 'Content-Length': 3 });
    res.end('cde');
  });
  const response = await fetch(url, { headers: { Range: 'bytes=2-4' } });
  assert.equal(range, 'bytes=2-4');
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 2-4/8');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-length'), '3');
  assert.equal(await response.text(), 'cde');
});

test('client disconnect closes unfinished upstream audio and proxy serves another request', { timeout: 5000 }, async (t) => {
  const closed = Promise.withResolvers();
  let closedStream = false;
  const url = await proxy(t, (_req, res) => {
    if (closedStream) return res.end('next');
    res.write('playing');
    res.once('close', () => closed.resolve(res.writableFinished));
  });
  const client = new AbortController();
  const response = await fetch(url, { signal: client.signal });
  const reader = response.body.getReader();
  assert.equal((await reader.read()).done, false);
  client.abort();
  assert.equal(await closed.promise, false);
  closedStream = true;
  assert.equal(await (await fetch(url)).text(), 'next');
});
