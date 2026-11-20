const { z } = require('zod');
const config = require('../services/recommendation/config');
const id = z.number().int().positive().max(2147483647);
const timestamp = z.string().refine((s) => {
  const time = Date.parse(s);
  return Number.isFinite(time) && new Date(time).toISOString() === s;
}, 'Use canonical UTC timestamp YYYY-MM-DDTHH:mm:ss.sssZ');
const common = { id, user_id: id, song_id: id, at: timestamp };
const event = z.discriminatedUnion('type', [
  z.strictObject({ ...common, type: z.literal('listen'), event_version: z.literal(1), qualified: z.boolean(),
    song_duration: z.number().finite().min(0).max(86400), total_listened_time: z.number().finite().min(0).max(86400) }),
  z.strictObject({ ...common, type: z.literal('favorite'), value: z.boolean() }),
  z.strictObject({ ...common, type: z.literal('rating'), score: z.number().int().min(1).max(5) }),
]);
const song = z.strictObject({ song_id: id, title: z.string().min(1).max(255), duration: z.number().int().min(0).max(86400),
  status: z.enum(['approved', 'pending', 'rejected']), is_visible: z.boolean(), available_at: timestamp, metadata_at: timestamp,
  genres: z.array(z.string().min(1).max(100)).max(20), artists: z.array(z.string().min(1).max(100)).max(20),
  mood: z.array(z.string().min(1).max(100)).max(20), keywords: z.array(z.string().min(1).max(100)).max(100),
  lyrics: z.string().max(config.maxLyrics) });
const schema = z.strictObject({ schema_version: z.literal(1), data_label: z.enum(['synthetic', 'real']),
  provenance: z.string().min(1).max(1000), catalog_version: z.string().min(1).max(100), seed: z.number().int().min(0).max(4294967295),
  catalog_as_of: timestamp, cutoffs: z.strictObject({ train_end: timestamp, validation_end: timestamp, test_end: timestamp }),
  catalog: z.array(song).max(config.maxCatalog), users: z.array(z.strictObject({ user_id: id, created_at: timestamp })).min(1).max(10000),
  events: z.array(event).max(config.maxSignals * 3) });

function validateInput(raw) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid evaluation input: ' + parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const d = parsed.data, { train_end: train, validation_end: val, test_end: end } = d.cutoffs;
  if (!(train < val && val < end) || d.catalog_as_of !== train) throw new Error('Invalid cutoffs or catalog_as_of: require train < validation < test and catalog_as_of=train');
  function unique(rows, key) { if (new Set(rows.map((r) => r[key])).size !== rows.length) throw new Error(`Duplicate ${key}`); }
  unique(d.catalog, 'song_id'); unique(d.users, 'user_id'); unique(d.events, 'id');
  const songs = new Map(d.catalog.map((s) => [s.song_id, s])), users = new Map(d.users.map((u) => [u.user_id, u]));
  for (const s of d.catalog) {
    if (s.available_at <= train && s.metadata_at > train) throw new Error('Missing catalog metadata as of train cutoff');
    if (s.metadata_at < s.available_at) throw new Error('metadata_at precedes availability');
  }
  for (const u of d.users) if (u.created_at > end) throw new Error('User created after evaluation end');
  for (const e of d.events) {
    if (!songs.has(e.song_id) || !users.has(e.user_id)) throw new Error('Unknown song/user reference');
    if (e.at < songs.get(e.song_id).available_at || e.at < users.get(e.user_id).created_at || e.at > end) throw new Error('Event timestamp outside valid availability/user/evaluation interval');
    if (e.type === 'listen' && e.qualified !== (e.song_duration >= 20 && e.total_listened_time >= 20)) throw new Error('Inconsistent T11 qualified receipt');
    if (e.type === 'listen' && e.song_duration !== songs.get(e.song_id).duration) throw new Error('Listen duration must match catalog snapshot');
  }
  return d;
}
module.exports = { validateInput };
