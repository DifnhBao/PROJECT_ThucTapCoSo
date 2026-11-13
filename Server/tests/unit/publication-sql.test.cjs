const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize } = require("../../src/models");
const playlistService = require("../../src/services/playlist.service");
const artistService = require("../../src/services/artist.service");
const favoriteService = require("../../src/services/favorite.service");

function assertPublicJoin(sql) {
  assert.match(sql, /`songs?`\.`status` = 'approved'/);
  assert.match(sql, /`songs?`\.`is_visible` = (?:true|1)/);
}

test("real Sequelize playlist SQL retains public-song joins and guest/owner/admin access predicates", async (t) => {
  const statements = [];
  t.mock.method(sequelize, "query", async (sql) => { statements.push(sql); return null; });
  for (const actor of [undefined, { userId: 7, role: "user", scope: "user" }, { userId: 9, role: "admin", scope: "admin" }]) {
    await assert.rejects(playlistService.getPlaylistDetail(10, actor), { statusCode: 404 });
    assertPublicJoin(statements.at(-1));
    assert.match(statements.at(-1), /LEFT OUTER JOIN/);
  }
  assert.match(statements[0], /`Playlist`\.`is_public` = (?:true|1)/);
  assert.match(statements[1], /`Playlist`\.`is_public` = (?:true|1) OR `Playlist`\.`user_id` = 7/);
  assert.doesNotMatch(statements[2], /`Playlist`\.`is_public` =/);
});

test("real Sequelize artist detail SQL filters unpublished songs without dropping empty artists", async (t) => {
  let statement;
  t.mock.method(sequelize, "query", async (sql) => { statement = sql; return null; });
  assert.equal(await artistService.getArtistById(1), null);
  assertPublicJoin(statement);
  assert.match(statement, /LEFT OUTER JOIN/);
});

test("real Sequelize favorite count and page queries both constrain publication", async (t) => {
  const statements = [];
  t.mock.method(sequelize, "query", async (sql, options) => {
    statements.push(sql);
    return options.plain ? { count: 0 } : [];
  });
  const result = await favoriteService.getMyFavoriteSongs(7, 1, 10);
  assert.equal(result.pagination.total, 0);
  assert.deepEqual(result.data, []);
  assert.equal(statements.length, 2);
  for (const sql of statements) {
    assertPublicJoin(sql);
    assert.match(sql, /INNER JOIN/);
    assert.match(sql, /`Favorite`\.`user_id` = 7/);
  }
});
