import test from "node:test";
import assert from "node:assert/strict";
import { PlayerService } from "../../app/features/player/playerService.ts";

test("player navigates a queue and stops at its end without browser or DB", () => {
  assert.equal(typeof window, "undefined");
  const player = new PlayerService();
  assert.equal(player.getCurrentTrack(), null);
  assert.equal(player.next(), null);
  const tracks = [1, 2, 3].map((trackId) => ({ trackId, title: `Track ${trackId}` }));
  player.setPlaylist(tracks, 0);
  assert.equal(player.getCurrentTrack().trackId, 1);
  assert.equal(player.next().trackId, 2);
  assert.equal(player.prev().trackId, 1);
  player.next();
  assert.equal(player.next().trackId, 3);
  assert.equal(player.next(), null);
  assert.equal(player.getCurrentTrack().trackId, 3);
});

for (const count of [0, 1, 20, 21]) test(`queue${count}: shuffle preserves identity and navigation respects boundaries`, () => {
  const player = new PlayerService();
  const tracks = Array.from({ length: count }, (_, i) => ({ trackId: i + 1, title: `Fixture ${i + 1}` }));
  player.setPlaylist(tracks, Math.max(0, count - 1));
  const selected = player.getCurrentTrack()?.trackId;
  for (let i = 0; i < 8; i++) {
    player.setShuffle(true); assert.equal(player.getCurrentTrack()?.trackId, selected);
    player.setShuffle(false); assert.equal(player.getCurrentTrack()?.trackId, selected);
  }
  assert.equal(player.remaining(), 0);
  assert.equal(player.next(), null);
  if (count) {
    assert.equal(player.next(true).trackId, 1);
    assert.equal(player.prev(), null);
    assert.equal(player.prev(true).trackId, count);
  } else { assert.equal(player.prev(true), null); assert.equal(player.next(true), null); }
});
test('append deduplicates within each page and across pages without moving the current shuffled track', () => {
  const player = new PlayerService(); player.setPlaylist([{ trackId: 1 }, { trackId: 2 }], 1); player.setShuffle(true);
  player.appendTracks([{ trackId: 2 }, { trackId: 3 }, { trackId: 3 }, { trackId: 4 }]);
  assert.equal(player.getCurrentTrack().trackId, 2);
  assert.deepEqual(player.getPlaylist().map((t) => t.trackId), [1, 2, 3, 4]);
  player.setShuffle(false); assert.equal(player.getCurrentTrack().trackId, 2);
  const copy = player.getPlaylist(); copy.length = 0; assert.equal(player.getPlaylist().length, 4);
});
test('invalid indexes and duplicate input never leave a nonempty queue without a current track', () => {
  for (const index of [-2, 900, NaN]) {
    const player = new PlayerService(); player.setPlaylist([{ trackId: 1 }, { trackId: 1 }, { trackId: 2 }], index);
    assert.ok(player.getCurrentTrack()); assert.equal(player.getPlaylist().length, 2);
  }
});
