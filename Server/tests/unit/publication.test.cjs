require("../helpers/mock-playlist-transactions.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { Favorite, Playlist, PlaylistSong, Artist, UserActivity, Rating, SongSimilarity } = require("../../src/models");
const { catalog, select, mockSongReads } = require("../fixtures/publication.cjs");
const songService = require("../../src/services/song.service");
const playlistService = require("../../src/services/playlist.service");
const favoriteService = require("../../src/services/favorite.service");
const artistService = require("../../src/services/artist.service");
const rec = require("../../src/services/recommendation/recommendation.service");
const { publicSongWhere } = require("../../src/policies/publication.policy");

test("public detail status matrix: only approved visible songs are readable", async (t) => {
  mockSongReads(t);
  for (const id of [1, 6]) assert.equal((await songService.getSongById(id)).song_id, id);
  for (const id of [2, 3, 4, 5]) await assert.rejects(songService.getSongById(id), { statusCode: 404 });
  assert.deepEqual(publicSongWhere({ status: "pending", is_visible: false }), { status: "approved", is_visible: true });
});

test("list/search/trending filter before limit; pending-only catalog stays empty", async (t) => {
  mockSongReads(t);
  assert.equal((await songService.getSongs({ limit: 1 })).total, 2);
  assert.deepEqual((await songService.searchSongs("Track", 1)).map((s) => s.song_id), [1]);
  assert.deepEqual((await rec.getTrendingSongs(1)).map((s) => s.song.song_id), [1]);
});

test("favorites and all artist read paths filter unpublished songs in their joins", async (t) => {
  const favorite = t.mock.method(Favorite, "findAndCountAll", async (options) => {
    const visible = select({ where: options.include[0].where });
    return { count: visible.length, rows: visible.map((song) => ({ song })) };
  });
  assert.deepEqual((await favoriteService.getMyFavoriteSongs(7, 1, 10)).data.map((f) => f.song.song_id), [1, 6]);
  assert.equal(favorite.mock.calls[0].arguments[0].include[0].required, true);
  const artist = t.mock.method(Artist, "findAll", async (options) => {
    assert.deepEqual(options.include[0].where, publicSongWhere());
    return [];
  });
  await artistService.getAllArtists();
  await artistService.getTopArtists();
  t.mock.method(Artist, "findByPk", async (id, options) => {
    assert.deepEqual(options.include[0].where, publicSongWhere());
    return { songs: select({ where: options.include[0].where }) };
  });
  assert.equal((await artistService.getArtistById(1)).songs.length, 2);
  assert.equal(artist.mock.callCount(), 2);
});

test("add-to-playlist rejects pending/rejected/hidden/deleted without writes", async (t) => {
  mockSongReads(t);
  t.mock.method(Playlist, "findOne", async () => ({ user_id: 7 }));
  const create = t.mock.method(PlaylistSong, "create", async () => ({}));
  for (const id of [2, 3, 4, 5]) await assert.rejects(playlistService.addSongToPlaylist(7, 1, id), { statusCode: 404 });
  assert.equal(create.mock.callCount(), 0);
});

test("existing playlist joins drop newly hidden songs while preserving an empty playlist", async (t) => {
  const source = catalog.map((song) => ({ ...song }));
  t.mock.method(Playlist, "findOne", async (options) => {
    assert.equal(options.include[0].required, false);
    return { playlist_id: 1, songs: select({ where: options.include[0].where }, source) };
  });
  const playlist = await playlistService.getPlaylistDetail(1);
  assert.deepEqual(playlist.songs.map((s) => s.song_id), [1, 6]);
  source.find((song) => song.song_id === 1).is_visible = false;
  assert.deepEqual((await playlistService.getPlaylistDetail(1)).songs.map((s) => s.song_id), [6]);
  t.mock.method(Playlist, "findAll", async (options) => {
    assert.deepEqual(options.include[0].where, publicSongWhere());
    assert.equal(options.include[0].required, false);
    return [{ playlist_id: 1, songs: [] }];
  });
  assert.equal((await playlistService.getMyPlaylists(7))[0].songs.length, 0);
});

test("unpublished songs cannot be liked/rated or increment views", async (t) => {
  mockSongReads(t);
  const ratingService = require("../../src/services/rating.service");
  const create = t.mock.method(Favorite, "create", async () => ({}));
  const rate = t.mock.method(Rating, "findOrCreate", async () => []);
  for (const id of [2, 3, 4, 5]) {
    await assert.rejects(favoriteService.toggleLikeSong(7, id), { statusCode: 404 });
    await assert.rejects(ratingService.rateSong(7, id, 5), { statusCode: 404 });
    await assert.rejects(songService.incrementSongView(id), { statusCode: 404 });
  }
  assert.equal(create.mock.callCount(), 0);
  assert.equal(rate.mock.callCount(), 0);
});

test("personal recommendation removes ineligible candidates before top-K and excludes hidden seed titles", async (t) => {
  mockSongReads(t);
  t.mock.method(UserActivity, "findAll", async () => []);
  t.mock.method(Favorite, "findAll", async () => [{ song_id: 1 }, { song_id: 4 }]);
  t.mock.method(Rating, "findAll", async () => []);
  const similar = t.mock.method(require('../../src/services/recommendation/snapshot.repository'), 'readNeighbors', async (ids) => {
    assert.deepEqual(ids, [1, 4]);
    // Repository SQL filters hidden seeds/candidates; hydration rechecks candidates.
    return [{ seed_id: 1, song_id: 2, seed_title: 'Track 1', final_score: .99 },
      { seed_id: 1, song_id: 6, seed_title: 'Track 1', final_score: .5 }];
  });
  const result = await rec.getRecommendationsForUser(7, 1);
  assert.deepEqual(result.map((item) => item.song.song_id), [6]);
  assert.equal(similar.mock.callCount(), 1);
});

test("similar query applies public join before top-K and rejects hidden source songs", async (t) => {
  mockSongReads(t);
  const find = t.mock.method(require('../../src/services/recommendation/snapshot.repository'), 'readNeighbors', async (ids) => {
    assert.deepEqual(ids, [1]);
    return [{ seed_id: 1, song_id: 2, final_score: .99 }, { seed_id: 1, song_id: 6, final_score: .5 }];
  });
  assert.deepEqual((await rec.getSimilarSongs(1, 1)).map((r) => r.song.song_id), [6]);
  await assert.rejects(rec.getSimilarSongs(4, 1), { statusCode: 404 });
  assert.equal(find.mock.callCount(), 1);
});

test("cold-start recommendation never returns an all-pending catalog", async (t) => {
  mockSongReads(t, catalog.filter((song) => song.status === "pending"));
  for (const model of [UserActivity, Favorite, Rating]) t.mock.method(model, "findAll", async () => []);
  assert.deepEqual(await rec.getRecommendationsForUser(7, 10), []);
});
