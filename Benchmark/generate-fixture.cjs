const fs = require('node:fs');
const path = require('node:path');
function fixture(seed = 150015) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error('Invalid fixture seed');
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const train = '2026-01-10T00:00:00.000Z', val = '2026-01-20T00:00:00.000Z', end = '2026-01-30T00:00:00.000Z';
  const early = '2026-01-01T00:00:00.000Z';
  const catalog = Array.from({ length: 21 }, (_, i) => ({ song_id: i + 1, title: `Synthetic track ${i + 1}`, duration: 180,
    status: i === 18 ? 'pending' : 'approved', is_visible: i !== 19,
    available_at: i === 20 ? '2026-01-25T00:00:00.000Z' : early,
    metadata_at: i === 20 ? '2026-01-25T00:00:00.000Z' : early,
    genres: [['pop', 'acoustic', 'electronic'][Math.floor(i / 6) % 3]], artists: [`Synthetic artist ${Math.floor(i / 3)}`],
    mood: [['bright', 'calm', 'energetic'][Math.floor(i / 6) % 3]], keywords: [`cluster${Math.floor(i / 6)}`],
    lyrics: `Synthetic lyric theme group ${Math.floor(i / 6)}` }));
  const users = Array.from({ length: 12 }, (_, i) => ({ user_id: i + 1, created_at: early }));
  const events = []; let id = 0;
  const add = (user_id, song_id, type, at, extra = {}) => events.push({ id: ++id, user_id, song_id, type, at, ...extra });
  const listen = (u, s, at, positive) => add(u, s, 'listen', at, { event_version: 1, qualified: positive, song_duration: 180, total_listened_time: positive ? 40 : 1 });
  for (let u = 1; u <= 8; u++) {
    const base = ((u - 1) % 3) * 6;
    add(u, base + 1, 'favorite', '2026-01-03T00:00:00.000Z', { value: true });
    add(u, base + 2, 'rating', '2026-01-04T00:00:00.000Z', { score: 5 });
    for (let j = 0; j < 2 + Math.floor(random() * 4); j++) listen(u, base + 1, `2026-01-0${5 + j}T00:00:00.000Z`, true);
    add(u, base + 6, 'rating', '2026-01-09T00:00:00.000Z', { score: 1 });
    add(u, base + 3, 'favorite', '2026-01-15T00:00:00.000Z', { value: true });
    listen(u, base + 4, '2026-01-25T00:00:00.000Z', true);
  }
  // Latest-state reconstruction, seen exclusion and future-item exclusion cases.
  add(1, 5, 'favorite', '2026-01-02T00:00:00.000Z', { value: true });
  add(1, 5, 'favorite', '2026-01-03T00:00:00.000Z', { value: false });
  listen(1, 1, '2026-01-26T00:00:00.000Z', true);
  add(9, 3, 'rating', '2026-01-15T00:00:00.000Z', { score: 5 });
  add(9, 10, 'favorite', '2026-01-25T00:00:00.000Z', { value: true });
  listen(9, 21, '2026-01-26T00:00:00.000Z', true);
  listen(10, 1, '2026-01-05T00:00:00.000Z', false);
  listen(10, 2, '2026-01-15T00:00:00.000Z', true);
  listen(10, 12, '2026-01-25T00:00:00.000Z', true);
  add(11, 2, 'favorite', '2026-01-03T00:00:00.000Z', { value: true });
  add(11, 9, 'rating', '2026-01-25T00:00:00.000Z', { score: 1 });
  listen(12, 3, '2026-01-25T00:00:00.000Z', false);
  return { schema_version: 1, data_label: 'synthetic', provenance: 'Seeded fictional clusters and timestamped events; no real users/media; not independent preference evidence.',
    catalog_version: 'synthetic-temporal-v1', seed, catalog_as_of: train, cutoffs: { train_end: train, validation_end: val, test_end: end }, catalog, users, events };
}
if (require.main === module) {
  const output = path.resolve(__dirname, 'fixtures/temporal-synthetic-v1.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(fixture(), null, 2) + '\n'); console.log('Generated synthetic evaluation fixture');
}
module.exports = { fixture };
