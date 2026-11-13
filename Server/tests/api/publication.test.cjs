const fetch = require("../helpers/browser-fetch.cjs");
require("../helpers/mock-session-boundary.cjs");
const { fetchPayload } = require("../helpers/fetch-payload.cjs");
const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");
const { createApp } = require("../../src/app");
const { Playlist, Favorite, SongSimilarity } = require("../../src/models");
const { catalog, matches, select, mockSongReads } = require("../fixtures/publication.cjs");
const rec = require("../../src/services/recommendation/recommendation.service");
let server, baseUrl;
const cookie = (userId, role = "user") => ({ Cookie: `${role === "user" ? "accessToken" : "accessToken_admin"}=${jwt.sign({ userId, role, scope: role === "user" ? "user" : "admin" }, process.env.JWT_SECRET)}` });
const request = (url, options = {}) => fetchPayload(baseUrl + url, { ...options, signal: AbortSignal.timeout(5000) });
before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test("public song detail enforces approved/visible matrix and admin preview stays separate", async (t) => {
  mockSongReads(t);
  assert.equal((await request("/songs/1")).status, 200);
  for (const id of [2, 3, 4, 5]) assert.equal((await request(`/songs/${id}`)).status, 404);
  assert.equal((await request("/songs/admin/2")).status, 401);
  assert.equal((await request("/songs/admin/2", { headers: cookie(7) })).status, 403);
  const preview = await request("/songs/admin/2", { headers: cookie(9, "admin") });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).data.status, "pending");
  // Sending an admin credential to the public endpoint does not enable preview.
  assert.equal((await request("/songs/2", { headers: cookie(9, "admin") })).status, 404);
});

test("public list/search exclude unpublished rows and do not starve top-K", async (t) => {
  mockSongReads(t);
  const list = await (await request("/songs?limit=1")).json();
  assert.equal(list.total, 2);
  assert.equal(list.songs[0].song_id, 1);
  const search = await request("/songs/search?q=Track&limit=1");
  assert.equal(search.status, 200);
  assert.equal(JSON.stringify(await search.json()).includes("/2.mp3"), false);
});

test("private playlists are visible only to owner/admin, public playlists retain only eligible songs", async (t) => {
  const playlists = [
    { playlist_id: 10, user_id: 7, is_public: false },
    { playlist_id: 11, user_id: 7, is_public: true },
    { playlist_id: 12, user_id: 7, is_public: true },
  ];
  t.mock.method(Playlist, "findOne", async (options) => {
    const playlist = playlists.find((row) => matches(row, options.where));
    return playlist ? { ...playlist, songs: select({ where: options.include[0].where }, playlist.playlist_id === 12 ? [] : catalog) } : null;
  });
  for (const headers of [undefined, cookie(8)]) {
    assert.equal((await request("/playlists/10", { headers })).status, 404);
    assert.equal((await request("/playlists/99", { headers })).status, 404);
  }
  for (const headers of [cookie(7), cookie(9, "admin"), cookie(9, "super_admin")]) {
    const response = await request("/playlists/10", { headers });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data.songs.map((s) => s.song_id), [1, 6]);
  }
  const publicList = await (await request("/playlists/11")).json();
  assert.deepEqual(publicList.data.songs.map((s) => s.song_id), [1, 6]);
  assert.deepEqual((await (await request("/playlists/12")).json()).data.songs, []);
  assert.equal((await request("/playlists/11", { headers: { Cookie: "accessToken=invalid" } })).status, 401);
});

test("debug is inaccessible to guests/users; admin debug also rejects unpublished pair", async (t) => {
  mockSongReads(t);
  const lookup = t.mock.method(SongSimilarity, "findOne", async () => ({ final_score: 0.4, detail: { internal: true } }));
  assert.equal((await request("/recommendations/debug/song-pair?songA=1&songB=2")).status, 401);
  assert.equal((await request("/recommendations/debug/song-pair?songA=1&songB=2", { headers: cookie(7) })).status, 403);
  assert.equal(lookup.mock.callCount(), 0);
  const response = await request("/recommendations/debug/song-pair?songA=1&songB=2", { headers: cookie(9, "admin") });
  assert.equal(response.status, 404);
  assert.equal(lookup.mock.callCount(), 0);
});

test("public recommendation explanation strips raw debug detail", async (t) => {
  const item = { song: catalog[0], final_score: 0.5, reason: "Public explanation", detail: { internal_matrix: [123] }, private_debug: "secret" };
  t.mock.method(rec, "getSimilarSongs", async () => [item]);
  const response = await request("/recommendations/songs/1/similar");
  const result = (await response.json()).data[0];
  assert.equal(result.reason, "Public explanation");
  assert.equal(result.detail, undefined);
  assert.equal(result.private_debug, undefined);
});

test("favorites and rating/view boundaries do not expose or mutate pending songs", async (t) => {
  mockSongReads(t);
  t.mock.method(Favorite, "findAndCountAll", async (options) => {
    const rows = select({ where: options.include[0].where }).map((song) => ({ song }));
    return { rows, count: rows.length };
  });
  const favorites = await request("/favorites/me", { headers: cookie(7) });
  assert.deepEqual((await favorites.json()).data.map((f) => f.song.song_id), [1, 6]);
  assert.equal((await request("/favorites/2/like-status", { headers: cookie(7) })).status, 404);
  assert.equal((await request("/ratings/song/2/summary")).status, 404);
  assert.equal((await request("/songs/2/view", { method: "POST", headers: cookie(7) })).status, 404);
});
