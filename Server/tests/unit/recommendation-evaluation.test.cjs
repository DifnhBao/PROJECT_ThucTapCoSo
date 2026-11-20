const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('../../../Benchmark/generate-fixture.cjs');
const { evaluate, signals, profile } = require('../../src/evaluation/evaluate');
const { rankingMetrics, summarize } = require('../../src/evaluation/metrics');
const { genreConsistency } = require('../../../Benchmark/benchmark');
const hand = require('../../../Benchmark/fixtures/metric-hand-calculated.json');
const sameRanks = (a, b) => assert.deepEqual(a.rows.map((r) => r.ranking), b.rows.map((r) => r.ranking));

test('T15: hand-calculated Recall, NDCG, K truncation, empty policy and coverage', () => {
  for (const c of hand.cases) {
    const actual = rankingMetrics(c.ranking, new Set(c.relevant), c.k);
    assert.equal(actual.recall, c.recall, c.name);
    if (c.ndcg === null) assert.equal(actual.ndcg, null); else assert.ok(Math.abs(actual.ndcg - c.ndcg) < 1e-12, c.name);
  }
  const result = summarize([{ ranking: [1, 2], relevant: [1], recall: 1, ndcg: 1 },
    { ranking: [2, 3], relevant: [3], recall: 1, ndcg: 0.6 }, { ranking: [4], relevant: [], recall: null, ndcg: null }], 4);
  assert.equal(result.catalog_coverage, hand.coverage_fixture.expected);
  assert.equal(result.evaluated_users, 2); assert.equal(result.excluded_no_relevant, 1);
  assert.throws(() => rankingMetrics([1, 1], new Set([1]), 2), /Duplicate/);
});
test('T15: global temporal split prevents future signals of all users entering features/popularity', () => {
  const d = fixture(), before = evaluate(d);
  d.events.push({ id: 9999, user_id: 12, song_id: 17, at: d.cutoffs.validation_end, type: 'favorite', value: true });
  d.events.push({ id: 10000, user_id: 9, song_id: 5, at: d.cutoffs.test_end, type: 'rating', score: 5 });
  const after = evaluate(d);
  assert.equal(after.training_hash, before.training_hash); assert.deepEqual(after.model_hashes, before.model_hashes); sameRanks(before, after);
  assert.notDeepEqual(before.rows.map((r) => r.relevant), after.rows.map((r) => r.relevant));
});
test('T15: future catalog metadata is excluded, known-at-cutoff metadata is required', () => {
  const d = fixture(), before = evaluate(d);
  d.catalog.at(-1).lyrics = 'Future information must never influence training';
  d.catalog.at(-1).genres = ['pop'];
  const after = evaluate(d);
  assert.equal(before.training_hash, after.training_hash); assert.deepEqual(before.model_hashes, after.model_hashes); sameRanks(before, after);
  d.catalog[0].metadata_at = d.cutoffs.validation_end;
  assert.throws(() => evaluate(d), /metadata as of train cutoff/);
});
test('T15: exact cutoff belongs to train; latest state, rating veto and activity ID order match serving', () => {
  const d = fixture();
  d.events.push({ id: 999, user_id: 12, song_id: 8, type: 'favorite', at: d.cutoffs.train_end, value: true });
  const result = evaluate(d);
  assert.equal(result.counts.train_events, d.events.filter((e) => e.at <= d.cutoffs.train_end).length);
  const train = d.events.filter((e) => e.at <= d.cutoffs.train_end);
  assert.equal(profile(train, 1).weights.has(5), false); // Added then removed favorite.
  assert.equal(profile(train, 1).rejected.has(6), true);
  assert.equal(profile(train, 12).weights.get(8), 5);
  assert.equal(signals([{ id: 1, user_id: 1, song_id: 1, type: 'rating', score: 5, at: 'a' },
    { id: 2, user_id: 1, song_id: 1, type: 'rating', score: 1, at: 'b' }])[2][0].score, 1);
});
test('T15: warm/cold cohorts, empty holdouts, eligibility, seen policy and baselines share conditions', () => {
  const d = fixture(), r = evaluate(d, 5);
  assert.equal(r.counts.eligible_catalog, 18);
  for (const split of ['validation', 'test']) {
    const all = r.metrics.filter((m) => m.split === split && m.cohort === 'all');
    assert.ok(all.every((m) => m.users === 12 && m.evaluated_users === 10 && m.excluded_no_relevant === 2));
  }
  for (const row of r.rows) {
    assert.ok(row.ranking.length <= 5 && new Set(row.ranking).size === row.ranking.length);
    assert.ok(row.ranking.every((id) => id >= 1 && id <= 18));
    const p = profile(d.events.filter((e) => e.at <= d.cutoffs.train_end), row.user_id);
    assert.ok(row.ranking.every((id) => !p.weights.has(id) && !p.rejected.has(id)));
  }
  const cold = r.rows.filter((row) => row.user_id === 10 && row.split === 'test');
  assert.ok(cold.every((row) => row.cohort === 'cold')); assert.deepEqual(cold[0].ranking, cold[1].ranking); assert.deepEqual(cold[1].ranking, cold[2].ranking);
  assert.equal(r.rows.find((row) => row.user_id === 1 && row.split === 'test').excluded_heldout_positive, 1);
  const noData = fixture(); noData.events = []; noData.catalog = [];
  assert.ok(evaluate(noData).metrics.every((m) => m.recall === null && m.ndcg === null && m.catalog_coverage === null));
});
test('T15: invalid inputs fail explicitly instead of producing plausible metrics', () => {
  const changes = [
    (d) => { d.cutoffs.validation_end = d.cutoffs.train_end; },
    (d) => { d.catalog_as_of = d.cutoffs.test_end; },
    (d) => { d.events.push(d.events[0]); },
    (d) => { d.events[0].song_id = 999; },
    (d) => { d.events[0].user_id = 999; },
    (d) => { d.events[0].at = '2026-02-30T00:00:00.000Z'; },
    (d) => { d.catalog[0].view_count = 99999; }, // Future aggregate must not be used.
    (d) => { d.events.find((e) => e.type === 'listen').qualified = false; },
    (d) => { d.events.find((e) => e.type === 'listen').song_duration = 50; },
    (d) => { d.config = { metadataWeight: 1 }; },
  ];
  for (const change of changes) { const d = fixture(); change(d); assert.throws(() => evaluate(d)); }
  for (const k of [0, -1, 1.5, 51, NaN]) assert.throws(() => evaluate(fixture(), k));
});
test('T15: fixed seed/config reproduces metrics and rankings without HTTP, models, DB or .env', () => {
  assert.deepEqual(fixture(), fixture()); assert.notDeepEqual(fixture(1).events, fixture(2).events);
  assert.deepEqual(evaluate(fixture()), evaluate(fixture()));
  const root = path.resolve(__dirname, '../../..'), base = path.join(root, '.local-backups/t15/repro');
  fs.mkdirSync(base, { recursive: true });
  const input = path.join(base, 'input.json'); fs.writeFileSync(input, JSON.stringify(fixture()));
  const code = `const M=require('module'), original=M._load;
    M._load=function(name,...args){if(name==='sequelize'||name==='dotenv'||/models|config[\\/]db|src[\\/]app/.test(name))throw Error('Forbidden dependency '+name);return original.call(this,name,...args)};
    require(${JSON.stringify(path.join(root, 'Benchmark/evaluate.cjs'))}).run(process.argv.slice(1));`;
  for (const name of ['one', 'two']) {
    const run = spawnSync(process.execPath, ['-e', code, '--', '--input', input, '--out', path.join(base, name), '--k', '5'], { encoding: 'utf8', cwd: root });
    assert.equal(run.status, 0, run.stderr);
  }
  for (const file of ['metrics.json', 'metrics.csv', 'rankings.json', 'manifest.json']) assert.deepEqual(fs.readFileSync(path.join(base, 'one', file)), fs.readFileSync(path.join(base, 'two', file)));
  const bad = spawnSync(process.execPath, [path.join(root, 'Benchmark/evaluate.cjs'), '--input', input, '--out', base, '--tune-on-test', 'yes'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
});
test('T15: genre smoke ignores engine explanations and missing slots count as non-matches', () => {
  const recs = [{ song: { genres: [{ name: 'Pop' }] }, reason: 'anything' }, { song: { genres: [{ name: 'Rock' }] }, reason: 'Pop ca từ đồng điệu romantic' }];
  assert.equal(genreConsistency(recs, ['Pop'], 5).genre_match_rate_at_k, .2);
  recs[1].reason = 'changed'; assert.equal(genreConsistency(recs, ['Pop'], 5).genre_match_rate_at_k, .2);
});
test('T15: offline Hybrid rankings match the actual serving wrapper on the same frozen snapshot', async (t) => {
  const { Song, UserActivity, Favorite, Rating } = require('../../src/models');
  const { Op } = require('sequelize');
  const repository = require('../../src/services/recommendation/snapshot.repository');
  const service = require('../../src/services/recommendation/recommendation.service');
  const { metadataFromSong, buildEdges } = require('../../src/services/recommendation/ranking');
  const { interactionMatrix } = require('../../src/services/recommendation/signals');
  const d = fixture(), train = d.events.filter((e) => e.at <= d.cutoffs.train_end), report = evaluate(d);
  const catalog = d.catalog.filter((s) => s.song_id <= 18).map((s) => ({ ...s, genres: s.genres.map((name) => ({ name })), artists: s.artists.map((name) => ({ name })) }));
  const edges = buildEdges(catalog.map(metadataFromSong), interactionMatrix(...signals(train.filter((e) => e.song_id <= 18))));
  t.mock.method(repository, 'readNeighbors', async (ids) => edges.filter((r) => ids.includes(r.seed_id)).map((r) => ({ ...r, seed_title: catalog.find((s) => s.song_id === r.seed_id).title })));
  for (const [index, model] of [UserActivity, Favorite, Rating].entries()) t.mock.method(model, 'findAll', async (q) => {
    let rows = signals(train.filter((e) => e.user_id === q.where.user_id))[index];
    if (index === 0) rows = rows.filter((e) => e.qualified).sort((a, b) => b.id - a.id);
    else rows = rows.sort((a, b) => a.song_id - b.song_id);
    if (q.where.score) rows = rows.filter((r) => r.score <= 2 && q.where.song_id[Op.in].includes(r.song_id));
    return rows.slice(0, q.limit);
  });
  t.mock.method(Song, 'findAll', async (q) => {
    let rows = catalog;
    if (q.where.song_id?.[Op.in]) rows = rows.filter((s) => q.where.song_id[Op.in].includes(s.song_id));
    if (q.where.song_id?.[Op.notIn]) rows = rows.filter((s) => !q.where.song_id[Op.notIn].includes(s.song_id));
    if (q.order) rows = rows.toSorted((a, b) => train.filter((e) => e.type === 'listen' && e.qualified && e.song_id === b.song_id).length - train.filter((e) => e.type === 'listen' && e.qualified && e.song_id === a.song_id).length || a.song_id - b.song_id);
    return rows.slice(0, q.limit);
  });
  for (const user of [1, 2, 9, 10]) {
    const expected = report.rows.find((r) => r.split === 'test' && r.model === 'Hybrid' && r.user_id === user).ranking;
    assert.deepEqual((await service.getRecommendationsForUser(user, 5)).map((r) => r.song.song_id), expected);
  }
});
