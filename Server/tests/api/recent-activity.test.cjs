require('../helpers/mock-session-boundary.cjs');
const { fetchPayload } = require('../helpers/fetch-payload.cjs');
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { sequelize, Song } = require('../../src/models');
const { encodeRecentCursor, decodeRecentCursor } = require('../../src/validation/recent-cursor');
let server, base;
before(async () => { server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/api/activity/me/recent`; });
after(async () => { await new Promise((resolve) => server.close(resolve)); });
const request = (query = '', user = 7) => fetchPayload(base + query, { headers: user ? { Cookie: `accessToken=${jwt.sign({ userId: user, role: 'user', scope: 'user' }, process.env.JWT_SECRET)}` } : {} });
const time = (day) => `2026-11-${day} 00:00:00.123456`;
function mockHistory(t) {
  const events = [[7, 1, 18], [7, 2, 20], [7, 1, 20], [7, 3, 19], [7, 4, 21], [7, 5, 21], [7, 6, 21], [8, 8, 21]];
  const hidden = new Map([[4, 'hidden'], [5, 'pending'], [6, 'rejected']]);
  t.mock.method(sequelize, 'query', async (sql, { replacements: r }) => {
    // Explicit SQL contract assertions; execution/EXPLAIN still requires MySQL.
    assert.match(sql, /MAX\(created_at\).*last_played/);
    assert.match(sql, /WHERE user_id = :userId GROUP BY song_id/);
    assert.match(sql, /INNER JOIN songs s/);
    assert.match(sql, /s.status = 'approved' AND s.is_visible = 1/);
    assert.match(sql, /ORDER BY recent.last_played DESC, s.song_id DESC LIMIT :take/);
    const grouped = new Map();
    for (const [user, song, day] of events) if (user === r.userId) grouped.set(song, Math.max(day, grouped.get(song) || 0));
    let rows = [...grouped].filter(([song]) => !hidden.has(song)).map(([song, day]) => ({ song_id: song, title: `Bài ${song}`, audio_url: `/api/media/${song}`, image_url: null, duration: 60, played_at: time(day) }));
    if (r.time) {
      assert.match(sql, /recent.last_played < :time OR \(recent.last_played = :time AND s.song_id < :songId\)/);
      rows = rows.filter((row) => row.played_at < r.time || row.played_at === r.time && row.song_id < r.songId);
    }
    return rows.sort((a, b) => b.played_at.localeCompare(a.played_at) || b.song_id - a.song_id).slice(0, r.take);
  });
  t.mock.method(Song, 'findAll', async ({ where }) => where.song_id.map((song_id) => ({ song_id, toJSON: () => ({ artists: [{ artist_id: 1, name: 'Nghệ sĩ' }] }) })));
}
test('recent history deduplicates latest plays, orders ties and filters hidden/pending/rejected songs', async (t) => {
  mockHistory(t);
  const response = await request(); assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const page = await response.json();
  assert.deepEqual(page.items.map((song) => song.song_id), [2, 1, 3]);
  assert.equal(page.items[1].lastPlayedAt, '2026-11-20T00:00:00.123456Z');
  assert.equal(page.items[0].artists[0].name, 'Nghệ sĩ');
  assert.equal(page.hasMore, false); assert.equal(page.nextCursor, null);
});
test('recent cursor pages are disjoint and preserve timestamp ties without skipping songs', async (t) => {
  mockHistory(t);
  const ids = []; let cursor = '';
  do {
    const page = await (await request(`?limit=1${cursor ? `&cursor=${cursor}` : ''}`)).json();
    ids.push(...page.items.map((song) => song.song_id)); cursor = page.nextCursor;
    assert.equal(page.hasMore, !!cursor);
  } while (cursor);
  assert.deepEqual(ids, [2, 1, 3]);
});
test('recent requires auth, isolates owners and rejects malformed queries', async (t) => {
  mockHistory(t);
  assert.equal((await request('', null)).status, 401);
  assert.deepEqual((await (await request('', 8)).json()).items.map((song) => song.song_id), [8]);
  assert.deepEqual((await (await request('', 9)).json()).items, []);
  for (const query of ['?cursor=garbage', '?cursor=', '?cursor=W10', '?limit=0', '?limit=101', '?limit=abc', '?user_id=8']) assert.equal((await request(query)).status, 400, query);
});
test('opaque cursor preserves microseconds and rejects noncanonical or invalid payloads', () => {
  const cursor = encodeRecentCursor(time(20), 2);
  assert.deepEqual(decodeRecentCursor(cursor), { time: time(20), id: 2 });
  for (const value of [cursor + '=', encodeRecentCursor(time(20), -1), encodeRecentCursor('bad', 2), Buffer.from('["2026-99-99 00:00:00.000000",1]').toString('base64url')]) assert.equal(decodeRecentCursor(value), null);
});
