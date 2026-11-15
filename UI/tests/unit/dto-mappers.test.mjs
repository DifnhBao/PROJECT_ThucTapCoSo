import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSongToTrack } from '../../app/utils/song.mapper.ts';
import { mapToPlaylist } from '../../app/features/playlist/playlist.mapper.ts';
import { errorMessage } from '../../app/lib/error-message.ts';
import { ApiError } from '../../app/lib/api-contract.ts';
import { toggleSongVisibility } from '../../app/features/song/song.api.ts';
import { discoverAuth } from '../../app/lib/auth-state.ts';
test('canonical song/playlist mappers preserve playback identity and populate all Track defaults', () => {
  const song = { song_id: 7, title: 'Fixture', duration: 40, audio_url: '/api/media/fixture' };
  const track = mapSongToTrack(song);
  assert.deepEqual(track, { trackId: 7, title: 'Fixture', duration: 40, audioUrl: '/api/media/fixture', imageUrl: '/images/default-song.svg', artistName: 'Unknown Artist', genre: 'Other', viewCount: 0, isVisible: true });
  const playlist = mapToPlaylist({ playlist_id: 3, user_id: 2, name: 'Private fixture', is_public: false, songs: [{ ...song, artists: [{ name: 'A' }, { name: 'B' }], image_url: null }] });
  assert.equal(playlist.isPublic, false); assert.equal(playlist.songs[0].songId, 7); assert.equal(playlist.songs[0].artistName, 'A, B'); assert.equal(playlist.songs[0].audioUrl, track.audioUrl);
});
test('unknown errors use a safe fallback while public transport messages remain intact', () => {
  assert.equal(errorMessage(new ApiError('Không có quyền.', 403, 'FORBIDDEN')), 'Không có quyền.');
  assert.equal(errorMessage({ message: 'untrusted object' }, 'Thử lại.'), 'Thử lại.'); assert.equal(errorMessage(null, 'Thử lại.'), 'Thử lại.');
});
test('active visibility client keeps PATCH/admin scope and the typed isVisible response', async (t) => {
  discoverAuth('admin'); const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ data: { isVisible: false }, meta: { requestId: 'fixture' } }), { headers: { 'Content-Type': 'application/json' } }); });
  assert.equal((await toggleSongVisibility(7)).isVisible, false);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, '/api/songs/7/toggle-invisibility'); assert.equal(calls[0].options.method, 'PATCH'); assert.equal(calls[0].options.headers.get('x-auth-type'), 'admin');
});
