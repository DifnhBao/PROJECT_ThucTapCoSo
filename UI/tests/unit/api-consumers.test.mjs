import { test } from 'node:test';
import assert from 'node:assert/strict';
import httpServer from 'node:http';
import { once } from 'node:events';
import http from '../../app/lib/http.ts';
import { loginApi } from '../../app/features/auth/api.ts';
import { logoutAdminApi } from '../../app/features/admin/api.ts';
import { getPlaylistDetailApi } from '../../app/features/playlist/api.ts';
import { getSongRatingSummary } from '../../app/features/rating/rating.api.ts';
import { getMyFavoriteSongs } from '../../app/features/like/favorite.api.ts';
import { artistService } from '../../app/features/artist/artistService.ts';
import { fetchDailySongs, searchSongs, fetchPendingSongsCount } from '../../app/features/song/song.api.ts';

test('actual Axios/fetch consumers preserve their DTOs against the new wire contract', async (t) => {
  const calls = [];
  const bodies = {};
  const requestHeaders = {};
  const song = { song_id: 1, title: 'Synthetic', duration: 180, audio_url: 'https://media.example.test/1.mp3', artists: [{ artist_id: 1, name: 'Synthetic Artist' }] };
  const payloads = { '/songs': { songs: [song], total: 1, page: 1, limit: 20 }, '/songs/search': { data: [song] }, '/songs/pending/count': { count: 3 }, '/playlists/1': { data: { playlist_id: 1, songs: [song] } }, '/ratings/song/1/summary': { song_id: 1, averageRating: 4, totalRatings: 2 }, '/favorites/me': { data: [{ song }], pagination: { total: 1 } }, '/artists': { data: [{ artist_id: 1, name: 'Synthetic Artist', image_url: null }] }, '/auth/login': { data: { user: { user_id: 1 } } }, '/auth/admin/logout': { message: 'Logged out' } };
  let denied = false;
  const server = httpServer.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    calls.push(url.pathname);
    requestHeaders[url.pathname] = request.headers;
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
    bodies[url.pathname] = Buffer.concat(chunks).toString('utf8');
    response.setHeader('Content-Type', 'application/json');
    if (denied && url.pathname === '/auth/login') {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', details: [] }, requestId: 'test-request' }));
    } else response.end(JSON.stringify({ data: payloads[url.pathname], meta: { requestId: 'test-request' } }));
    });
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const previous = http.defaults.baseURL;
  http.defaults.baseURL = base;
  t.after(() => { http.defaults.baseURL = previous; });
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => originalFetch(new URL(String(url).replace(/^\/api/, ''), base), options));
  assert.equal((await loginApi('synthetic', 'Synthetic1!')).data.data.user.user_id, 1);
  assert.equal((await getPlaylistDetailApi(1)).data.playlist_id, 1);
  assert.equal((await getSongRatingSummary(1)).averageRating, 4);
  assert.equal((await getMyFavoriteSongs()).data[0].song.song_id, 1);
  assert.equal((await artistService.getArtists())[0].artistId, 1);
  assert.equal((await fetchDailySongs()).songs[0].trackId, 1);
  assert.equal((await searchSongs('Synthetic'))[0].trackId, 1);
  assert.equal(await fetchPendingSongsCount(), 3);
  await logoutAdminApi();
  assert.equal(bodies['/auth/admin/logout'], '{}');
  assert.equal(requestHeaders['/auth/admin/logout']['x-auth-type'], 'admin');
  denied = true;
  await assert.rejects(loginApi('denied', 'Synthetic1!'), (error) => error.response.status === 401 && error.response.data.code === 'INVALID_CREDENTIALS' && error.message === 'Invalid credentials');
  assert.equal(calls.includes('/auth/refresh-token'), false);
});
