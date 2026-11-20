const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../../src/app');
const { Song, sequelize } = require('../../src/models');
const { fetchPayload } = require('../helpers/fetch-payload.cjs');

test('search pages and counts distinct published songs before loading all their artists', async (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE songs (song_id INTEGER PRIMARY KEY, title TEXT, view_count INTEGER,
      status TEXT, is_visible INTEGER, ${Object.keys(Song.rawAttributes)
        .filter((key) => !['song_id', 'title', 'view_count', 'status', 'is_visible'].includes(key)).join(', ')});
    CREATE TABLE artists (artist_id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE song_artists (song_id INTEGER, artist_id INTEGER);
    INSERT INTO songs (song_id, title, view_count, status, is_visible) VALUES
      (1,'Duet',20,'approved',1), (2,'Hit single',20,'approved',1),
      (3,'Hit encore',10,'approved',1), (4,'Hit pending',99,'pending',1),
      (5,'Hit rejected',99,'rejected',1), (6,'Hit hidden',99,'approved',0),
      (7,'Unrelated',99,'approved',1);
    INSERT INTO artists VALUES (1,'Hit singer'), (2,'Hit band'), (3,'Guest');
    INSERT INTO song_artists VALUES (1,1), (1,2), (1,3);
  `);
  // Execute Sequelize's generated SELECTs locally, including the real ORM
  // hydration that used to collapse joined rows after LIMIT.
  t.mock.method(sequelize, 'query', async (sql, options) => {
    const rows = db.prepare(sql).all(options.replacements);
    return new sequelize.dialect.Query(null, sequelize, options).handleSelectQuery(rows);
  });
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/songs/search?q=Hit&limit=2`;
  for (const [suffix, expected] of [['', [1, 2]], ['&page=2', [3]], ['&page=3', []]]) {
    const response = await fetchPayload(url + suffix);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-total-count'), '3');
    const { data } = await response.json();
    assert.deepEqual(data.map((song) => song.song_id), expected);
    if (!suffix) assert.deepEqual(data[0].artists.map((a) => a.name).sort(), ['Guest', 'Hit band', 'Hit singer']);
  }
});
