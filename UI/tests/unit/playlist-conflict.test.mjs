import { test } from 'node:test';
import assert from 'node:assert/strict';
import httpServer from 'node:http';
import { once } from 'node:events';
import http from '../../app/lib/http.ts';
import { addSongToPlaylistApi } from '../../app/features/playlist/api.ts';
test('actual playlist client exposes the duplicate409 message to the add modal without refresh/retry', async (t) => {
  let calls = 0;
  const message = 'Bài hát đã có trong playlist.';
  const server = httpServer.createServer((req, res) => {
    calls++;
    req.resume();
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'PLAYLIST_SONG_EXISTS', message, details: [] }, requestId: 'fixture' }));
  }).listen(0, '127.0.0.1');
  await once(server, 'listening'); t.after(() => new Promise((resolve) => server.close(resolve)));
  const before = http.defaults.baseURL; http.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
  t.after(() => { http.defaults.baseURL = before; });
  await assert.rejects(addSongToPlaylistApi(1, 1), (error) => error.response.status === 409 && error.response.data.code === 'PLAYLIST_SONG_EXISTS' && error.message === message);
  assert.equal(calls, 1);
});
