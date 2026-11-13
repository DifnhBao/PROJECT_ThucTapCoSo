const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { sequelize, Song, UserActivity, Rating, Favorite } = require('../../src/models');
const { rebuild } = require('../../src/services/recommendation/snapshot.service');
const rec = require('../../src/services/recommendation/recommendation.service');
const repo = require('../../src/services/recommendation/snapshot.repository');
const config = require('../../src/services/recommendation/config');

module.exports = async function snapshots(t) {
  const evidence = path.resolve(__dirname, '../../..', process.env.RECOMMENDATION_EVIDENCE_DIR || 'docs/verification/evidence/T14');
  fs.mkdirSync(evidence, { recursive: true });
  const state = async () => (await sequelize.query('SELECT active_run_id FROM recommendation_state WHERE id=1'))[0][0].active_run_id;
  let first;
  await t.test('no snapshot does not use legacy similarities or compute realtime; cold start and short skips are public', async () => {
    assert.deepEqual(await rec.getSimilarSongs(1), []);
    await UserActivity.create({ user_id: 5, song_id: 1, session_id: randomUUID(), event_version: 1,
      qualified: false, source: 'search', song_duration: 181, total_listened_time: 1, exit_reason: 'skipped' });
    const cold = await rec.getRecommendationsForUser(2, 3), skipped = await rec.getRecommendationsForUser(5, 3);
    assert.deepEqual(skipped.map((r) => r.song.song_id), cold.map((r) => r.song.song_id));
    assert.equal(skipped.length, 3); assert.ok(skipped.every((r) => r.accumulated_score === null));
  });
  await t.test('batch rebuild publishes validated immutable version; serving is deterministic and deduplicated', async () => {
    first = await rebuild(); assert.equal(first.song_count, 25); assert.ok(first.edge_count > 0);
    assert.equal(await state(), first.run_id);
    const rows = await rec.getSimilarSongs(1, 3);
    assert.equal(rows.length, 3); assert.equal(new Set(rows.map((r) => r.song.song_id)).size, 3);
    assert.ok(rows.every((r) => r.song.song_id <= 25 && r.detail.run_id === first.run_id));
    assert.deepEqual((await rec.getSimilarSongs(1, 3)).map((r) => r.song.song_id), rows.map((r) => r.song.song_id));
  });
  await t.test('eligibility changes filter source/candidate/explanations before top-K; explicit dislike vetoes', async () => {
    const top = (await rec.getSimilarSongs(1, 1))[0].song.song_id;
    await Song.update({ is_visible: false }, { where: { song_id: top } });
    const next = await rec.getSimilarSongs(1, 2); assert.equal(next.length, 2);
    assert.ok(next.every((r) => r.song.song_id !== top));
    await assert.rejects(rec.getSimilarSongs(top), { statusCode: 404 });
    await Song.update({ is_visible: true }, { where: { song_id: top } });
    await Favorite.create({ user_id: 2, song_id: 1 });
    await Rating.create({ user_id: 2, song_id: top, score: 1 });
    const personal = await rec.getRecommendationsForUser(2, 5);
    assert.equal(new Set(personal.map((r) => r.song.song_id)).size, personal.length);
    assert.ok(personal.every((r) => r.song.song_id !== top && r.song.song_id !== 1));
    await Song.update({ is_visible: false }, { where: { song_id: 1 } });
    assert.ok((await rec.getRecommendationsForUser(2, 5)).every((r) => !r.reason.includes('Synthetic Track 01')));
    await Song.update({ is_visible: true }, { where: { song_id: 1 } });
  });
  await t.test('failure after writes preserves active snapshot and rolls back orphan rows', async () => {
    await assert.rejects(rebuild({ beforePublish: async () => { throw new Error('simulated crash'); } }), /simulated crash/);
    assert.equal(await state(), first.run_id);
    const [[counts]] = await sequelize.query('SELECT COUNT(*) AS n FROM recommendation_runs');
    assert.equal(Number(counts.n), 1);
  });
  await t.test('concurrent rebuild rejected cross-connection; readers see old or new version, never partial', async () => {
    let release, entered; const gate = new Promise((resolve) => { release = resolve; });
    const started = new Promise((resolve) => { entered = resolve; });
    const pending = rebuild({ beforePublish: async () => { entered(); await gate; } });
    try {
      await Promise.race([started, pending.then(() => { throw new Error('Rebuild finished before test gate'); })]);
      assert.equal(await state(), first.run_id);
      assert.ok((await repo.readNeighbors([1, 2])).every((r) => r.run_id === first.run_id));
      await assert.rejects(rebuild(), { code: 'REBUILD_BUSY' });
    } finally { release(); }
    const second = await pending;
    assert.equal(await state(), second.run_id);
    assert.ok((await repo.readNeighbors([1, 2])).every((r) => r.run_id === second.run_id));
  });
  const report = { synthetic: true, mysql: (await sequelize.query('SELECT VERSION() AS v'))[0][0].v,
    config, measurements: [], note: 'First call and warm calls; no MySQL buffer flush. Small local synthetic fixture, not production capacity.' };
  async function measure(label, fn) {
    const calls = []; const previous = sequelize.options.logging;
    try {
      for (let i = 0; i < 4; i++) {
        let queries = 0; const sql = [];
        sequelize.options.logging = (query) => { queries++; sql.push(query.replace(/^Executing \([^)]*\): /, '')); };
        const start = performance.now(); const result = await fn();
        calls.push({ state: i === 0 ? 'first-call' : 'warm', latency_ms: +(performance.now() - start).toFixed(3), queries, returned: result.length,
          ...(i === 0 ? { sql } : {}) });
      }
    } finally { sequelize.options.logging = previous; }
    report.measurements.push({ label, calls });
  }
  await t.test('query count remains bounded as catalog grows; actual EXPLAIN and first/warm timings', async () => {
    await measure('similar-25', () => rec.getSimilarSongs(1, 10));
    await measure('personal-25', () => rec.getRecommendationsForUser(1, 10));
    await measure('cold-start-25', () => rec.getRecommendationsForUser(5, 10));
    await Song.bulkCreate(Array.from({ length: 103 }, (_, i) => ({ song_id: i + 100, title: `Synthetic extra ${i}`,
      duration: 180, audio_url: 'https://media.example.test/synthetic.mp3', status: 'approved', is_visible: true,
      lyrics: 'Synthetic fixture', uploaded_by: 3 })));
    report.rebuild = await rebuild(); assert.equal(report.rebuild.song_count, 128);
    const [[count]] = await sequelize.query('SELECT MAX(n) AS n FROM (SELECT COUNT(*) AS n FROM recommendation_neighbors WHERE run_id=:id GROUP BY seed_id) x', { replacements: { id: report.rebuild.run_id } });
    assert.equal(Number(count.n), config.topK);
    await measure('similar-128', () => rec.getSimilarSongs(1, 10));
    await measure('personal-128', () => rec.getRecommendationsForUser(1, 10));
    await Favorite.bulkCreate(Array.from({ length: 20 }, (_, i) => ({ user_id: 1, song_id: i + 1 })), { ignoreDuplicates: true });
    await measure('personal-20seeds-128', () => rec.getRecommendationsForUser(1, 10));
    assert.ok((await repo.readNeighbors(Array.from({ length: 20 }, (_, i) => i + 1))).length <= config.maxSeeds * config.topK);
    assert.equal(report.measurements[0].calls[0].queries, report.measurements[3].calls[0].queries);
    assert.equal(report.measurements[1].calls[0].queries, report.measurements[4].calls[0].queries);
    assert.ok(report.measurements.every((m) => m.calls.every((c) => c.queries <= 8)));
    const activityQuery = "SELECT song_id FROM UserActivities WHERE user_id=1 AND event_version=1 AND qualified=1 ORDER BY id DESC LIMIT 200";
    const neighborQuery = "SELECT song_id, final_score FROM recommendation_neighbors WHERE run_id=:id AND seed_id=1 ORDER BY final_score DESC, song_id ASC LIMIT 50";
    report.explain = {
      activityBefore: (await sequelize.query('EXPLAIN ' + activityQuery.replace('UserActivities', 'UserActivities IGNORE INDEX (ix_activity_user_qualified_recent)')))[0],
      activityAfter: (await sequelize.query('EXPLAIN ' + activityQuery))[0],
      neighborBefore: (await sequelize.query('EXPLAIN ' + neighborQuery.replace('recommendation_neighbors', 'recommendation_neighbors IGNORE INDEX (ix_neighbor_rank)'), { replacements: { id: report.rebuild.run_id } }))[0],
      neighborAfter: (await sequelize.query('EXPLAIN ' + neighborQuery, { replacements: { id: report.rebuild.run_id } }))[0],
    };
    const actual = report.measurements[3].calls[0].sql.find((sql) => sql.includes('JOIN recommendation_neighbors'));
    report.explain.actualServingBefore = (await sequelize.query('EXPLAIN ' + actual.replace('FORCE INDEX (ix_neighbor_rank)', 'IGNORE INDEX (ix_neighbor_rank)')))[0];
    report.explain.actualServingAfter = (await sequelize.query('EXPLAIN ' + actual))[0];
    const batch = report.measurements[5].calls[0].sql.find((sql) => sql.includes('JOIN recommendation_neighbors'));
    report.explain.batchServing = (await sequelize.query('EXPLAIN ' + batch))[0];
    report.counts = { songs: await Song.count(), activities: await UserActivity.count(), favorites: await Favorite.count(), ratings: await Rating.count() };
    fs.writeFileSync(path.join(evidence, 'query-latency.json'), JSON.stringify(report, null, 2));
  });
  await t.test('empty catalog publishes empty snapshot; no relaxation to pending; capacity failure keeps previous', async () => {
    await Song.update({ status: 'pending' }, { where: {} });
    const empty = await rebuild(); assert.equal(empty.edge_count, 0); assert.equal(empty.song_count, 0);
    assert.deepEqual(await rec.getRecommendationsForUser(1, 10), []);
    await Song.update({ status: 'approved', is_visible: true }, { where: {} });
    await Song.bulkCreate(Array.from({ length: config.maxCatalog }, (_, i) => ({ title: `Capacity fixture ${i}`, duration: 180,
      audio_url: 'https://media.example.test/synthetic.mp3', uploaded_by: 3 })));
    await assert.rejects(rebuild(), { code: 'RECOMMENDATION_CAPACITY' });
    assert.equal(await state(), empty.run_id);
  });
};
