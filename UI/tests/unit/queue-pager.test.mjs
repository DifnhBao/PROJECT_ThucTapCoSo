import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerService } from '../../app/features/player/playerService.ts';
import { QueuePager } from '../../app/features/player/queuePager.ts';
const tracks = (count, start = 1) => Array.from({ length: count }, (_, i) => ({ trackId: start + i, title: 'Fixture' }));
test('startup/finite queues never request catalog; explicit catalog starts at the supplied next page', async () => {
  const player = new PlayerService(); let calls = 0;
  const pager = new QueuePager(player, async (limit, page) => { calls++; assert.equal(page, 2); return { songs: tracks(1, 21), page, limit, total: 21 }; });
  await pager.loadNext(); assert.equal(calls, 0);
  for (const count of [1, 20, 21]) { player.setPlaylist(tracks(count), 0); pager.reset(); await pager.loadNext(); }
  assert.equal(calls, 0);
  player.setPlaylist(tracks(20), 19); pager.reset({ nextPage: 2, hasMore: true, pageSize: 20 });
  await pager.loadNext(); assert.equal(calls, 1); assert.equal(player.getPlaylist().length, 21); assert.equal(pager.state.hasMore, false);
});
test('concurrent callers share a flight, and an empty page is terminal', async () => {
  const player = new PlayerService(); player.setPlaylist(tracks(20), 0); let resolve, calls = 0;
  const pager = new QueuePager(player, (limit, page) => { calls++; return new Promise((r) => { resolve = () => r({ songs: [], page, limit, total: 100 }); }); });
  pager.reset({ nextPage: 2, hasMore: true }); const a = pager.loadNext(), b = pager.loadNext(); assert.equal(a, b);
  resolve(); await a; assert.equal(pager.state.hasMore, false);
  await pager.loadNext(); assert.equal(calls, 1);
});
test('reset aborts old fetch; even a server ignoring abort cannot append into a different playlist or clear its flight', async () => {
  const player = new PlayerService(); player.setPlaylist(tracks(20), 19); const pending = [];
  const pager = new QueuePager(player, (limit, page, signal) => new Promise((resolve) => pending.push({ resolve, signal, limit, page })));
  pager.reset({ nextPage: 2, hasMore: true }); const old = pager.loadNext();
  player.setPlaylist(tracks(20, 101), 0); pager.reset({ nextPage: 2, hasMore: true }); assert.equal(pending[0].signal.aborted, true);
  const fresh = pager.loadNext();
  pending[0].resolve({ songs: tracks(1, 21), page: 2, limit: 20, total: 21 }); await old;
  assert.equal(pager.state.loading, true); assert.equal(player.getPlaylist().length, 20);
  pending[1].resolve({ songs: tracks(1, 121), page: 2, limit: 20, total: 21 }); await fresh;
  assert.equal(player.getCurrentTrack().trackId, 101); assert.equal(player.getPlaylist().at(-1).trackId, 121); assert.equal(pager.state.loading, false);
});
test('offline retries are bounded; rerenders cannot retry until explicit recovery', async () => {
  const player = new PlayerService(); player.setPlaylist(tracks(20), 0); let calls = 0, offline = true;
  const pager = new QueuePager(player, async (limit, page) => { calls++; if (offline) throw new TypeError('offline'); return { songs: tracks(1, 21), page, limit, total: 21 }; });
  pager.reset({ nextPage: 2, hasMore: true }); await pager.loadNext(); assert.equal(calls, 2); assert.ok(pager.state.error);
  for (let i = 0; i < 10; i++) await pager.loadNext(); assert.equal(calls, 2);
  offline = false; await pager.loadNext(true); assert.equal(calls, 3); assert.equal(pager.state.error, null); assert.equal(player.getPlaylist().length, 21);
});
test('quota errors do not auto-retry and duplicate-only pages cannot loop', async () => {
  const player = new PlayerService(); player.setPlaylist(tracks(20), 0); let calls = 0;
  const pager = new QueuePager(player, async () => { calls++; throw { status: 429 }; });
  pager.reset({ nextPage: 2, hasMore: true }); await pager.loadNext(); assert.equal(calls, 1);
  const duplicates = new QueuePager(player, async (limit, page) => ({ songs: tracks(20), page, limit, total: 100 }));
  duplicates.reset({ nextPage: 2, hasMore: true }); await duplicates.loadNext(); assert.equal(duplicates.state.hasMore, false);
});
