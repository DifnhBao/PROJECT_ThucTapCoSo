const { createHash } = require('node:crypto');
const { validateInput } = require('./input');
const { rankingMetrics, summarize } = require('./metrics');
const { userSignals, interactionMatrix, qualified } = require('../services/recommendation/signals');
const { metadataFromSong, buildEdges, selectSeeds, rankPersonal } = require('../services/recommendation/ranking');
const config = require('../services/recommendation/config');
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Resolve state-changing favorites/ratings at the supplied cutoff; never read a future row.
function signals(events) {
  const activities = [], favorites = new Map(), ratings = new Map();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id)) {
    const key = `${e.user_id}:${e.song_id}`;
    if (e.type === 'listen') activities.push(e);
    else if (e.type === 'favorite') { if (e.value) favorites.set(key, e); else favorites.delete(key); }
    else ratings.set(key, e);
  }
  return [activities, [...favorites.values()], [...ratings.values()]];
}
function profile(events, userId) {
  const [activities, favorites, ratings] = signals(events.filter((e) => e.user_id === userId));
  const bounded = userSignals(activities.filter(qualified).sort((a, b) => b.id - a.id).slice(0, config.maxUserSignals),
    favorites.sort((a, b) => a.song_id - b.song_id).slice(0, config.maxUserSignals),
    ratings.sort((a, b) => a.song_id - b.song_id).slice(0, config.maxUserSignals));
  // Mirrors the serving batch veto query outside the bounded ratings window.
  for (const r of ratings) if (r.score <= config.lowRating) bounded.rejected.add(r.song_id);
  return bounded;
}

function evaluate(raw, k = 5) {
  if (!Number.isInteger(k) || k < 1 || k > 50) throw new Error('K must be an integer in [1,50]');
  const d = validateInput(raw), train = d.events.filter((e) => e.at <= d.cutoffs.train_end);
  const catalog = d.catalog.filter((s) => s.available_at <= d.cutoffs.train_end && s.metadata_at <= d.cutoffs.train_end && s.status === 'approved' && s.is_visible)
    .sort((a, b) => a.song_id - b.song_id);
  const eligible = new Set(catalog.map((s) => s.song_id));
  const sources = signals(train.filter((e) => eligible.has(e.song_id)));
  if (sources.some((rows) => rows.length > config.maxSignals)) throw new Error('Training signal capacity exceeded');
  const toMetadata = () => catalog.map((s) => metadataFromSong({ ...s, genres: s.genres.map((name) => ({ name })), artists: s.artists.map((name) => ({ name })) }));
  const hybridEdges = buildEdges(toMetadata(), interactionMatrix(...sources));
  const contentEdges = buildEdges(toMetadata(), new Map());
  const titles = new Map(catalog.map((s) => [s.song_id, s.title])), popularity = new Map(catalog.map((s) => [s.song_id, 0]));
  for (const e of sources[0]) if (qualified(e)) popularity.set(e.song_id, popularity.get(e.song_id) + 1);
  const trending = catalog.map((s) => s.song_id).sort((a, b) => popularity.get(b) - popularity.get(a) || a - b);
  const rows = [];
  for (const user of d.users.toSorted((a, b) => a.user_id - b.user_id)) {
    const { weights, rejected } = profile(train, user.user_id), seeds = selectSeeds(weights);
    const usableSeeds = new Set(seeds.map(([id]) => id).filter((id) => eligible.has(id) && !rejected.has(id)));
    const cohort = usableSeeds.size ? 'warm' : 'cold';
    // Same candidate set, seen-item window and negative policy for every model.
    const candidates = new Set([...eligible].filter((id) => !weights.has(id) && !rejected.has(id)));
    const fallback = trending.filter((id) => candidates.has(id)).slice(0, k);
    const predict = (edges) => {
      const neighbors = edges.filter((r) => usableSeeds.has(r.seed_id) && eligible.has(r.song_id))
        .map((r) => ({ ...r, seed_title: titles.get(r.seed_id) }));
      const result = rankPersonal(neighbors, weights, rejected).filter((r) => candidates.has(r.song_id)).map((r) => r.song_id).slice(0, k);
      return result.length ? result : fallback;
    };
    const rankings = { Popularity: fallback, 'Content-only': predict(contentEdges), Hybrid: predict(hybridEdges) };
    for (const [split, start, end] of [['validation', d.cutoffs.train_end, d.cutoffs.validation_end], ['test', d.cutoffs.validation_end, d.cutoffs.test_end]]) {
      const heldout = d.events.filter((e) => e.user_id === user.user_id && e.at > start && e.at <= end);
      const positive = userSignals(...signals(heldout)).weights;
      const relevant = new Set([...positive.keys()].filter((id) => candidates.has(id)));
      for (const [model, ranking] of Object.entries(rankings)) rows.push({ split, model, cohort, user_id: user.user_id,
        candidate_count: candidates.size, raw_heldout_positive: positive.size, excluded_heldout_positive: positive.size - relevant.size,
        relevant: [...relevant].sort((a, b) => a - b), ranking, ...rankingMetrics(ranking, relevant, k) });
    }
  }
  const metrics = [];
  for (const split of ['validation', 'test']) for (const model of ['Popularity', 'Content-only', 'Hybrid']) for (const cohort of ['all', 'warm', 'cold']) {
    metrics.push({ split, model, cohort, ...summarize(rows.filter((r) => r.split === split && r.model === model && (cohort === 'all' || r.cohort === cohort)), catalog.length) });
  }
  return { evaluator_version: 'temporal-v1', algorithm_version: config.version, config, seed: d.seed, data_label: d.data_label,
    provenance: d.provenance, catalog_version: d.catalog_version, cutoffs: d.cutoffs, k,
    protocol: { training: 'at <= train_end; frozen for both validation and test; no tuning',
      relevant: 'held-out qualified listens/favorites/high ratings, latest state within each split; low rating veto; eligible and unseen',
      empty_relevance: 'exclude from macro averages; count explicitly', seen: 'positive weights in serving bounded training profile',
      coverage_denominator: 'all eligible training-catalog songs', popularity: 'training qualified receipt count; ID tie-break',
      metadata: 'catalog snapshot as of train cutoff; future items excluded', seed: 'fixture generation only; rankings use deterministic song-ID tie-break' },
    counts: { users: d.users.length, catalog: d.catalog.length, eligible_catalog: catalog.length, events: d.events.length, train_events: train.length,
      validation_events: d.events.filter((e) => e.at > d.cutoffs.train_end && e.at <= d.cutoffs.validation_end).length,
      test_events: d.events.filter((e) => e.at > d.cutoffs.validation_end).length },
    training_hash: hash({ sources, catalog }), model_hashes: { Hybrid: hash(hybridEdges), 'Content-only': hash(contentEdges), Popularity: hash(trending.map((id) => [id, popularity.get(id)])) },
    metrics, rows };
}
module.exports = { evaluate, signals, profile, hash };
