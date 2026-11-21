const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const fetch = require('../helpers/browser-fetch.cjs');
require('../helpers/mock-session-boundary.cjs');
const { createApp } = require('../../src/app');
const { sequelize, Favorite, Song, Rating, UserActivity } = require('../../src/models');
const repository = require('../../src/services/recommendation/snapshot.repository');
const { buildEdges, metadataFromSong } = require('../../src/services/recommendation/ranking');
const { rankingMetrics } = require('../../src/evaluation/metrics');

const USER_ID = 42;
let server, base;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

function request(path, body, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    headers.Cookie = `accessToken=${jwt.sign({ userId: USER_ID, role: 'user', scope: 'user' }, process.env.JWT_SECRET)}`;
  }
  return fetch(base + path, { headers, signal: AbortSignal.timeout(5000),
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  });
}
const submit = (songIds, authenticated) => request('/favorites/batch', { songIds }, authenticated);

test('F3 batch requires auth and rejects malformed IDs before starting a transaction', async (t) => {
  const transaction = t.mock.method(sequelize, 'transaction', () => assert.fail('unexpected transaction'));
  assert.equal((await submit([1, 2, 3], false)).status, 401);
  for (const songIds of [[1, 2], Array.from({ length: 11 }, (_, i) => i + 1),
    [1, 1, 2], [1, 2, 3.5], [1, 2, '3'], [1, 2, 0], [1, 2, 2147483648]]) {
    const response = await submit(songIds);
    assert.equal(response.status, 400, JSON.stringify(songIds));
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(transaction.mock.callCount(), 0);
});

test('F3 batch rejects pending, rejected, hidden and absent songs without saving any favorite', async (t) => {
  const tx = { LOCK: { SHARE: 'SHARE' } };
  t.mock.method(sequelize, 'transaction', (work) => work(tx));
  const catalog = [
    { song_id: 1, status: 'approved', is_visible: true },
    { song_id: 2, status: 'approved', is_visible: true },
    { song_id: 3, status: 'pending', is_visible: true },
    { song_id: 4, status: 'rejected', is_visible: true },
    { song_id: 5, status: 'approved', is_visible: false },
  ];
  t.mock.method(Song, 'findAll', async ({ where, transaction, lock }) => {
    assert.equal(transaction, tx);
    assert.equal(lock, 'SHARE');
    return catalog.filter((song) => where.song_id.includes(song.song_id) &&
      song.status === where.status && song.is_visible === where.is_visible);
  });
  const insert = t.mock.method(Favorite, 'bulkCreate', () => assert.fail('partial write'));
  for (const id of [3, 4, 5, 6]) {
    const response = await submit([1, 2, id]);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'STARTER_SONG_UNAVAILABLE');
  }
  assert.equal(insert.mock.callCount(), 0);
});

test('F3 replay stays idempotent and starter favorites improve Recall@3 and NDCG@3 on an existing snapshot', async (t) => {
  const catalog = Array.from({ length: 9 }, (_, i) => {
    const jazz = i < 6;
    return {
      song_id: i + 1, title: jazz ? `Jazz ${i + 1}` : `Rock ${i + 1}`,
      genres: [{ name: jazz ? 'Jazz' : 'Rock' }], artists: [],
      duration: jazz ? 180 : 350, status: 'approved', is_visible: true, view_count: jazz ? i : 100 - i,
    };
  });
  const snapshot = buildEdges(catalog.map(metadataFromSong), new Map()).map((edge) => ({
    ...edge, seed_title: catalog[edge.seed_id - 1].title,
  }));
  const tx = { LOCK: { SHARE: 'SHARE' } };
  let committed = new Map();
  let staged;
  t.mock.method(sequelize, 'transaction', async (work) => {
    staged = new Map(committed);
    const result = await work(tx);
    committed = staged;
    return result;
  });
  t.mock.method(Favorite, 'bulkCreate', async (rows, options) => {
    assert.equal(options.transaction, tx);
    assert.deepEqual(options.updateOnDuplicate, ['song_id']);
    assert.deepEqual(rows.map((row) => row.song_id), [1, 2, 3]);
    for (const row of rows) {
      assert.equal(row.user_id, USER_ID);
      staged.set(row.song_id, staged.get(row.song_id) ?? row);
    }
  });
  t.mock.method(Favorite, 'findAll', async ({ where }) => {
    assert.equal(where.user_id, USER_ID);
    return [...committed.values()];
  });
  t.mock.method(UserActivity, 'findAll', async () => []);
  t.mock.method(Rating, 'findAll', async () => []);
  t.mock.method(Song, 'findAll', async ({ where, limit }) => {
    assert.equal(where.status, 'approved');
    assert.equal(where.is_visible, true);
    const ids = where.song_id?.[Op.in] ?? where.song_id;
    if (ids) return catalog.filter((song) => ids.includes(song.song_id));
    return catalog.toSorted((a, b) => b.view_count - a.view_count).slice(0, limit);
  });
  const neighbors = t.mock.method(repository, 'readNeighbors', async (ids) =>
    snapshot.filter((edge) => ids.includes(edge.seed_id)));
  const feed = async () => {
    const response = await request('/recommendations/me?limit=3');
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  const initial = await feed();
  assert.equal(initial.mode, 'cold_start');
  assert.equal(neighbors.mock.callCount(), 0);
  assert.ok(initial.data.every((item) => item.accumulated_score === null && /thịnh hành/.test(item.reason)));

  for (let i = 0; i < 2; i++) {
    const response = await submit([3, 1, 2]);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { songIds: [3, 1, 2], count: 3 });
    assert.equal(committed.size, 3);
  }
  const updated = await feed();
  assert.equal(updated.mode, 'personalized');
  assert.deepEqual(neighbors.mock.calls[0].arguments, [[1, 2, 3]]);
  assert.ok(updated.data.every((item) => item.accumulated_score > 0 && item.endorsed_by_count === 3 &&
    /^Từ bài "Jazz [123]" bạn đã yêu thích\./.test(item.reason)));
  const ids = (result) => result.data.map((item) => item.song.song_id);
  const relevant = new Set([4, 5, 6]);
  assert.deepEqual(ids(initial), [7, 8, 9]);
  assert.deepEqual(ids(updated), [4, 5, 6]);
  const scores = (result) => {
    const { recall, ndcg } = rankingMetrics(ids(result), relevant, 3);
    return [recall, ndcg];
  };
  assert.deepEqual(scores(initial), [0, 0]);
  assert.deepEqual(scores(updated), [1, 1]);
});
