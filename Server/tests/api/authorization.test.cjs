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
  const get = t.mock.method(recommendation, "getRecommendationsForUser", async () => []);
  assert.equal((await request("/recommendations/me")).status, 401);
  assert.equal((await request("/recommendations/me?userId=2&limit=3", { headers: cookie("user") })).status, 400);
  assert.equal(get.mock.callCount(), 0);
  assert.equal((await request("/recommendations/me?limit=3", { headers: cookie("user") })).status, 200);
  assert.deepEqual(get.mock.calls[0].arguments, [1, 3]);
  assert.equal((await request("/recommendations/users/2", { headers: cookie("user") })).status, 404);
  assert.equal(get.mock.callCount(), 1);
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
