// Pure shared engine: no models, environment loading, HTTP or database connection.
const config = require('./config');
const { buildLyricsTfIdfVectorMap } = require('./lyricsSimilarity.service');
const { computeHybridPair, buildReason } = require('./hybridSimilarity.service');
const { normalizeMood, normalizeJsonArrayLike } = require('./metadataSimilarity.service');
const rank = (a, b) => b.final_score - a.final_score || a.song_id - b.song_id;
function buildEdges(metadata, matrix) {
  const vectors = buildLyricsTfIdfVectorMap(metadata);
  for (const song of metadata) song.lyricsVector = vectors.get(song.song_id) || new Map();
  const neighbors = new Map(metadata.map((s) => [s.song_id, []]));
  for (let i = 0; i < metadata.length; i++) for (let j = i + 1; j < metadata.length; j++) {
    const a = metadata[i], b = metadata[j];
    const p = computeHybridPair(a, b, matrix);
    if (![p.finalScore, p.metadataScore, p.behavioralScore].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) {
      throw new Error('Invalid snapshot score');
    }
    if (p.finalScore <= 0) continue;
    const common = { final_score: p.finalScore, metadata_score: p.metadataScore, behavioral_score: p.behavioralScore,
      reason: buildReason(p.metaDetail, p.behavDetail), detail: JSON.stringify({ metadata_detail: p.metaDetail, behavioral_detail: p.behavDetail }) };
    for (const [seed, target] of [[a, b], [b, a]]) {
      const list = neighbors.get(seed.song_id);
      list.push({ seed_id: seed.song_id, song_id: target.song_id, ...common });
      list.sort(rank); if (list.length > config.topK) list.pop();
    }
  }
  return [...neighbors.values()].flat();
}

function metadataFromSong(s) {
  return { song_id: s.song_id, title: s.title, duration: s.duration,
    genres: s.genres.map((g) => g.name.toLowerCase().trim()), artists: s.artists.map((a) => a.name.toLowerCase().trim()),
    moods: normalizeMood(s.mood), keywords: normalizeJsonArrayLike(s.keywords), lyrics: s.lyrics || '' };
}
function selectSeeds(weights) {
  return [...weights].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, config.maxSeeds);
}
function rankPersonal(rows, weights, rejected) {
  const byId = new Map();
  for (const r of rows) {
    const id = Number(r.song_id);
    if (weights.has(id) || rejected.has(id) || rejected.has(Number(r.seed_id))) continue;
    const contribution = Number(r.final_score) * weights.get(Number(r.seed_id));
    const item = byId.get(id) || { song_id: id, accumulated_score: 0, endorsed_by_count: 0,
      is_discovery_candidate: true, best: -1 };
    item.accumulated_score += contribution; item.endorsed_by_count++;
    if (contribution > item.best) {
      item.best = contribution;
      item.reason = `Từ bài "${r.seed_title}" bạn có tương tác tích cực. ${r.reason}`;
      item.detail = { algorithm_version: r.algorithm_version, run_id: r.run_id };
    }
    byId.set(id, item);
  }
  return [...byId.values()].sort((a, b) => b.accumulated_score - a.accumulated_score || a.song_id - b.song_id)
    .map(({ best, ...item }) => item);
}
module.exports = { buildEdges, rank, metadataFromSong, selectSeeds, rankPersonal };
