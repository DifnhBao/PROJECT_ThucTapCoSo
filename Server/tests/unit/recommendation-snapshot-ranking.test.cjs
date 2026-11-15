const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildEdges } = require('../../src/services/recommendation/snapshot.service');
test('T14: equal scores use song ID tie-break and retain only directed top-50 per source', () => {
  const metadata = Array.from({ length: 55 }, (_, i) => ({ song_id: i + 1, title: `Fixture ${i}`, duration: 180,
    genres: ['pop'], artists: [], moods: [], keywords: [], lyrics: '' }));
  const edges = buildEdges(metadata, new Map());
  assert.equal(edges.length, 55 * 50);
  assert.deepEqual(edges.filter((r) => r.seed_id === 1).map((r) => r.song_id), Array.from({ length: 50 }, (_, i) => i + 2));
  assert.ok(edges.every((r) => r.seed_id !== r.song_id && Number.isFinite(r.final_score)));
  assert.deepEqual(edges, buildEdges(metadata.toReversed(), new Map()).sort((a, b) => a.seed_id - b.seed_id || b.final_score - a.final_score || a.song_id - b.song_id));
});
