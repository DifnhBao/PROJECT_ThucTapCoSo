require("../helpers/mock-playlist-transactions.cjs");
const fetch = require("../helpers/browser-fetch.cjs");
require("../helpers/mock-session-boundary.cjs");
const { fetchPayload } = require("../helpers/fetch-payload.cjs");
const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createApp } = require("../../src/app");
const { User, Playlist, PlaylistSong, Song } = require("../../src/models");
const recommendation = require("../../src/services/recommendation/recommendation.service");
let server;
let baseUrl;
const token = (userId, role = "user", scope = role === "user" ? "user" : "admin") => jwt.sign({ userId, role, scope }, process.env.JWT_SECRET);
const cookie = (role, userId = 1) => ({ Cookie: `${role === "user" ? "accessToken" : "accessToken_admin"}=${token(userId, role)}` });
const request = (url, options = {}) => fetchPayload(baseUrl + url, { ...options, signal: AbortSignal.timeout(5000) });
const json = (method, body, headers) => ({ method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test("recommendations/me uses signed actor identity and old user-ID route is gone", async (t) => {
  const get = t.mock.method(recommendation, "getRecommendationFeed", async () => ({ mode: "cold_start", items: [] }));
  assert.equal((await request("/recommendations/me")).status, 401);
  assert.equal((await request("/recommendations/me?userId=2&limit=3", { headers: cookie("user") })).status, 400);
  assert.equal(get.mock.callCount(), 0);
  assert.equal((await request("/recommendations/me?limit=3", { headers: cookie("user") })).status, 200);
  assert.deepEqual(get.mock.calls[0].arguments, [1, 3]);
  assert.equal((await request("/recommendations/users/2", { headers: cookie("user") })).status, 404);
  assert.equal(get.mock.callCount(), 1);
});

test("my submissions return only the signed-in uploader's tracks, newest first", async (t) => {
  const fixtures = [
    { song_id: 1, uploaded_by: 1, status: "pending", rejection_reason: null, reviewed_at: null },
    { song_id: 2, uploaded_by: 1, status: "approved", rejection_reason: null, reviewed_at: "2026-11-20T01:00:00.000Z" },
    { song_id: 3, uploaded_by: 1, status: "rejected", rejection_reason: "Thiếu thông tin bản quyền", reviewed_at: "2026-11-20T02:00:00.000Z" },
    { song_id: 4, uploaded_by: 2, status: "pending", rejection_reason: null, reviewed_at: null },
  ].map((song) => ({
    title: `Track ${song.song_id}`,
    created_at: `2026-11-20T00:0${song.song_id === 3 ? 2 : song.song_id}:00.000Z`,
    duration: 180,
    image_url: null,
    audio_url: "/private-audio",
    artists: [{ artist_id: 1, name: "Artist" }],
    genres: [],
    is_visible: song.status === "approved",
    ...song,
  }));
  const findAll = t.mock.method(Song, "findAll", async ({ where, attributes, order }) => {
    assert.deepEqual(order, [["created_at", "DESC"], ["song_id", "DESC"]]);
    return fixtures.filter((song) => song.uploaded_by === where.uploaded_by)
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at) || b.song_id - a.song_id)
      .map((song) => ({
        ...Object.fromEntries(attributes.map((key) => [key, song[key]])),
        artists: song.artists,
        genres: song.genres,
      }));
  });
  t.mock.method(Song, "findOne", async ({ where }) =>
    fixtures.find((song) => Object.entries(where).every(([key, value]) => song[key] === value)) || null);

  const path = "/songs/me/submissions";
  assert.equal((await request(path)).status, 401);
  assert.equal((await request(path + "?userId=1", { headers: cookie("user", 2) })).status, 400);
  assert.equal(findAll.mock.callCount(), 0);

  const owner = await request(path, { headers: cookie("user") });
  assert.equal(owner.status, 200);
  assert.equal(owner.headers.get("cache-control"), "private, no-store");
  const { data } = await owner.json();
  assert.deepEqual(data.map(({ song_id, status }) => [song_id, status]), [[3, "rejected"], [2, "approved"], [1, "pending"]]);
  assert.equal(data[0].rejection_reason, "Thiếu thông tin bản quyền");
  assert.equal(data[0].reviewed_at, fixtures[2].reviewed_at);
  assert.equal(data[2].reviewed_at, null);
  assert.deepEqual(data[0].artists, [{ artist_id: 1, name: "Artist" }]);
  assert.ok(data.every((song) => !("audio_url" in song) && !("uploaded_by" in song)));

  const other = await request(path, { headers: cookie("user", 2) });
  assert.equal(other.status, 200);
  assert.deepEqual((await other.json()).data.map((song) => song.song_id), [4]);
  for (const id of [1, 3]) {
    assert.equal((await request(`/songs/${id}`, { headers: cookie("user", 2) })).status, 404);
    assert.equal((await request(`/songs/admin/${id}`, { headers: cookie("user", 2) })).status, 403);
  }
});

test("admin moderation validates, saves and clears optional rejection metadata", async (t) => {
  const songs = new Map([1, 2, 3, 4].map((song_id) => [
    song_id, { song_id, title: "Fixture", status: "pending", rejection_reason: "Stale reason" },
  ]));
  t.mock.method(Song, "findByPk", async (id) => songs.get(id));
  const update = t.mock.method(Song, "update", async (changes, { where }) => {
    const song = songs.get(where.song_id);
    if (song?.status !== where.status) return [0];
    Object.assign(song, changes);
    return [1];
  });
  const headers = cookie("admin");

  for (const body of [{ rejection_reason: 42 }, { rejection_reason: null }, { rejection_reason: "x".repeat(501) }, { userId: 2 }]) {
    assert.equal((await request("/songs/1/reject", json("PATCH", body, headers))).status, 400);
  }
  assert.equal((await request("/songs/1/reject", json("PATCH", {}, cookie("user")))).status, 403);
  assert.equal(update.mock.callCount(), 0);
  assert.equal((await request("/songs/1/reject", json("PATCH", { rejection_reason: "  Thiếu bản quyền  " }, headers))).status, 200);
  assert.equal(songs.get(1).status, "rejected");
  assert.equal(songs.get(1).is_visible, false);
  assert.equal(songs.get(1).rejection_reason, "Thiếu bản quyền");
  assert.ok(songs.get(1).reviewed_at instanceof Date);

  assert.equal((await request("/songs/2/reject", { method: "PATCH", headers })).status, 200);
  assert.equal(songs.get(2).rejection_reason, null);
  assert.equal((await request("/songs/3/reject", json("PATCH", { rejection_reason: "   " }, headers))).status, 200);
  assert.equal(songs.get(3).rejection_reason, null);
  assert.equal((await request("/songs/4/approve", { method: "PATCH", headers })).status, 200);
  assert.equal(songs.get(4).rejection_reason, null);
  assert.equal(songs.get(4).status, "approved");
  assert.equal(songs.get(4).is_visible, true);
  assert.ok(songs.get(4).reviewed_at instanceof Date);
  assert.equal((await request("/songs/1/approve", { method: "PATCH", headers })).status, 409);
});

test("signed malformed identity and inconsistent scope/role are rejected before service access", async () => {
  for (const userId of [0, -1, "1oops", 1.5]) {
    assert.equal((await request("/users/me", { headers: cookie("user", userId) })).status, 401);
  }
  assert.equal((await request("/users/me", { headers: { Cookie: `accessToken=${token(1, "admin", "user")}` } })).status, 401);
  assert.equal((await request("/users/me", { headers: { Cookie: `accessToken=${token(1, "admin")}` } })).status, 403);
});

test("profile /me rejects injected identity and role; valid updates use the principal", async (t) => {
  const target = { user_id: 1, role: "user", first_name: "before", save: t.mock.fn(async () => {}) };
  const find = t.mock.method(User, "findByPk", async () => target);
  const res = await request("/users/me", json("PUT", { userId: 2, user_id: 2, role: "super_admin", firstName: "after" }, cookie("user")));
  assert.equal(res.status, 400);
  assert.equal(find.mock.callCount(), 0);
  assert.equal((await request('/users/me', json('PUT', { firstName: 'after' }, cookie('user')))).status, 200);
  assert.equal(find.mock.calls[0].arguments[0], 1);
  assert.equal(target.user_id, 1);
  assert.equal(target.role, "user");
  assert.equal(target.first_name, "after");
  assert.equal((await request("/users/profile/2", { headers: cookie("user") })).status, 403);
  assert.equal(find.mock.callCount(), 1);
});

test("HTTP admin reset deny cases do not persist credentials; allowed reset still works", async (t) => {
  let targetRole = "super_admin";
  const save = t.mock.fn(async () => {});
  t.mock.method(User, "findByPk", async (id) => ({ user_id: id, role: targetRole, username: "fixture", save }));
  t.mock.method(bcrypt, "genSalt", async () => "salt");
  const hash = t.mock.method(bcrypt, "hash", async () => "hash");
  for (const [role, target] of [["admin", "super_admin"], ["admin", "admin"], ["super_admin", "super_admin"]]) {
    targetRole = target;
    assert.equal((await request("/users/2/reset-password", json("PUT", { newPassword: "NewPassword123!" }, cookie(role)))).status, 403);
  }
  assert.equal((await request("/users/1/reset-password", json("PUT", { newPassword: "NewPassword123!" }, cookie("super_admin")))).status, 403);
  assert.equal(save.mock.callCount(), 0);
  assert.equal(hash.mock.callCount(), 0);
  targetRole = "user";
  assert.equal((await request("/users/2/reset-password", json("PUT", { newPassword: "NewPassword123!" }, cookie("admin")))).status, 200);
  assert.equal(save.mock.callCount(), 1);
  assert.equal((await request("/users/2x/reset-password", json("PUT", { newPassword: "NewPassword123!" }, cookie("admin")))).status, 400);
});

test("admin self password endpoint enforces current password and principal identity", async (t) => {
  const save = t.mock.fn(async () => {});
  const find = t.mock.method(User, "findByPk", async () => ({ user_id: 1, role: "admin", password: "old", save }));
  const compare = t.mock.method(bcrypt, "compare", async () => false);
  const body = { oldPassword: "wrong", newPassword: "NewPassword123!" };
  assert.equal((await request('/users/admin/change-password', json('POST', { ...body, userId: 2 }, cookie('admin')))).status, 400);
  assert.equal(find.mock.callCount(), 0);
  assert.equal((await request("/users/admin/change-password", json("POST", body, cookie("admin")))).status, 403);
  assert.equal(save.mock.callCount(), 0);
  compare.mock.mockImplementation(async () => true);
  t.mock.method(bcrypt, "genSalt", async () => "salt");
  t.mock.method(bcrypt, "hash", async () => "hash");
  assert.equal((await request("/users/admin/change-password", json("POST", body, cookie("admin")))).status, 200);
  assert.equal(find.mock.calls[1].arguments[0], 1);
  assert.equal(save.mock.callCount(), 1);
});

test("only super_admin may create admin; body role is not authoritative", async (t) => {
  const create = t.mock.method(User, "create", async (fields) => ({ ...fields }));
  t.mock.method(User, "findOne", async () => null);
  const body = { username: "fixture-admin", email: "fixture@example.test", password: "NewPassword123!", role: "super_admin" };
  assert.equal((await request("/users/admin/new", json("POST", body, cookie("admin")))).status, 403);
  assert.equal(create.mock.callCount(), 0);
  assert.equal((await request('/users/admin/new', json('POST', body, cookie('super_admin')))).status, 400);
  delete body.role;
  assert.equal((await request("/users/admin/new", json("POST", body, cookie("super_admin")))).status, 201);
  assert.equal(create.mock.calls[0].arguments[0].role, "admin");
});

test("playlist mutations scope ownership and reject other users before any writes", async (t) => {
  const find = t.mock.method(Playlist, "findOne", async () => null);
  const songFind = t.mock.method(Song, "findOne", async () => ({}));
  const create = t.mock.method(PlaylistSong, "create", async () => ({}));
  const destroy = t.mock.method(PlaylistSong, "destroy", async () => 1);
  for (const [url, options] of [
    ["/playlists/9/songs", json("POST", { songId: 3 }, cookie("user"))],
    ["/playlists/9/songs/3", { method: "DELETE", headers: cookie("user") }],
    ["/playlists/9", { method: "DELETE", headers: cookie("user") }],
  ]) assert.equal((await request(url, options)).status, 404);
  for (const call of find.mock.calls) assert.deepEqual(call.arguments[0].where, { playlist_id: 9, user_id: 1 });
  assert.equal(create.mock.callCount(), 0);
  assert.equal(destroy.mock.callCount(), 0);
  assert.equal(songFind.mock.callCount(), 0);
});

test("playlist owner can still add/remove songs and delete their own playlist", async (t) => {
  const destroyPlaylist = t.mock.fn(async () => {});
  t.mock.method(Playlist, "findOne", async () => ({ user_id: 1, destroy: destroyPlaylist }));
  t.mock.method(Song, "findOne", async () => ({ song_id: 3 }));
  t.mock.method(PlaylistSong, "findOne", async () => null);
  const create = t.mock.method(PlaylistSong, "create", async () => ({ song_id: 3 }));
  t.mock.method(PlaylistSong, "destroy", async () => 1);
  assert.equal((await request("/playlists/9/songs", json("POST", { songId: 3 }, cookie("user")))).status, 200);
  assert.equal((await request("/playlists/9/songs/3", { method: "DELETE", headers: cookie("user") })).status, 200);
  assert.equal((await request("/playlists/9", { method: "DELETE", headers: cookie("user") })).status, 200);
  assert.equal(create.mock.callCount(), 1);
  assert.equal(destroyPlaylist.mock.callCount(), 1);
});
