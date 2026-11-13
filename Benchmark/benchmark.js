const fs = require('node:fs');
const path = require('node:path');
// Manually assigned demo genres are a smoke-test target, never held-out relevance.
const targets = { 1: ['Dance Pop', 'R&B'], 2: ['Rap Việt'], 3: ['Ballad', 'Acoustic'], 4: ['EDM', 'Dance Pop'] };
function genreConsistency(recommendations, genres, k = 5) {
  if (!Array.isArray(recommendations) || !Array.isArray(genres) || !genres.length || !Number.isInteger(k) || k < 1) throw new Error('Invalid genre smoke input');
  const items = recommendations.slice(0, k);
  const matches = items.filter((r) => Array.isArray(r.song?.genres) && r.song.genres.some((g) => genres.includes(g.name))).length;
  return { requested_slots: k, returned: items.length, genre_matches: matches, genre_match_rate_at_k: matches / k };
}
async function run(args = []) {
  let users, source;
  if (args.length === 2 && args[0] === '--input') {
    const fixture = JSON.parse(fs.readFileSync(path.resolve(args[1]), 'utf8'));
    if (fixture.data_label !== 'synthetic' || !Array.isArray(fixture.users) || !fixture.users.length) throw new Error('Synthetic fixture required');
    users = fixture.users; source = 'synthetic-fixture';
  } else if (args.length === 1 && args[0] === '--api') {
    users = []; source = 'HTTP with synthetic demo targets; API data provenance not established';
    for (const [id, target_genres] of Object.entries(targets)) {
      const token = process.env[`BENCHMARK_TOKEN_USER_${id}`];
      if (!token) throw new Error(`Missing BENCHMARK_TOKEN_USER_${id}`);
      const response = await fetch(`${process.env.BENCHMARK_API_ORIGIN || 'http://127.0.0.1:5000'}/api/recommendations/me?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Smoke API status ${response.status}`);
      const body = await response.json(); if (!Array.isArray(body.data)) throw new Error('Invalid recommendation envelope');
      users.push({ user_id: Number(id), target_genres, recommendations: body.data });
    }
  } else throw new Error('Use --input synthetic.json or --api with explicit demo credentials');
  const rows = users.map((u) => ({ user_id: u.user_id, ...genreConsistency(u.recommendations, u.target_genres) }));
  return { label: 'synthetic genre-consistency smoke test', source,
    limitation: 'Manual genre agreement only; not preference accuracy, MAP, serendipity or retention evidence. Reasons are ignored.',
    mean_genre_match_rate_at_5: rows.reduce((n, r) => n + r.genre_match_rate_at_k, 0) / rows.length, rows };
}
if (require.main === module) run(process.argv.slice(2)).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exitCode = 1; });
module.exports = { genreConsistency, run };
