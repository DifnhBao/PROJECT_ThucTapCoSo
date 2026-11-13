const { getTestDatabaseConfig } = require('../config/test-database');
const { getDatabaseConfig } = require('../src/config/env');

function seedConfig(mode, env = process.env) {
  let database;
  if (mode === 'test') database = getTestDatabaseConfig(env, { destructive: true });
  else if (mode === 'demo' && env.NODE_ENV === 'development' && env.DEMO_SEED_ALLOWED === 'yes') {
    database = getDatabaseConfig(env);
    if (!/^tunetrek_demo(?:_[a-z0-9]+)*$/.test(database.database) || !['127.0.0.1', 'localhost', '::1', 'db'].includes(database.host)) throw new Error('Demo seed requires an isolated local tunetrek_demo database');
  } else throw new Error('Seed requires explicit test or opted-in development demo environment');
  const password = env[mode === 'test' ? 'TEST_SEED_PASSWORD' : 'DEMO_SEED_PASSWORD'];
  if (typeof password !== 'string' || password.length < 12 || password.length > 72 || /^(replace|change|your)[-_ ]/i.test(password)) throw new Error('Seed password must be supplied via the matching env variable (12-72 characters)');
  return { database, password };
}

async function seed(mode, env = process.env) {
  const { database, password } = seedConfig(mode, env); // Before importing models or connecting.
  const { Sequelize, QueryTypes } = require('sequelize');
  const bcrypt = require('bcryptjs');
  const db = new Sequelize(database);
  try {
    return await db.transaction(async (transaction) => {
      const options = { transaction };
      // Empty-only seed: repeat/concurrent attempts fail clearly; never overwrite accounts.
      for (const table of Object.keys(require('./schema-v1.cjs')(Sequelize))) {
        const rows = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``, { ...options, type: QueryTypes.SELECT });
        if (Number(rows[0].n)) throw new Error('Seed refused: target must contain no application data; repeat seed does not append duplicates');
      }
      const q = db.getQueryInterface();
      const now = new Date('2026-01-01T00:00:00Z');
      const times = { created_at: now, updated_at: now };
      const hash = await bcrypt.hash(password, 10);
      await q.bulkInsert('users', ['userA', 'userB', 'admin', 'super_admin', 'cold_start'].map((name, i) => ({ user_id: i + 1, username: `demo_${name}`, email: `${name.toLowerCase()}@example.test`, password: hash, role: i === 2 ? 'admin' : i === 3 ? 'super_admin' : 'user', is_active: true, activity_status: 'offline', ...times })), options);
      await q.bulkInsert('artists', [1, 2, 3].map((i) => ({ artist_id: i, name: `Synthetic Artist ${i}`, normalized_name: `synthetic-artist-${i}` })), options);
      await q.bulkInsert('genres', ['Pop', 'Rock', 'Jazz', 'Electronic'].map((name, i) => ({ genre_id: i + 1, name, normalized_name: name.toLowerCase() })), options);
      await q.bulkInsert('songs', Array.from({ length: 28 }, (_, index) => {
        const i = index + 1;
        return { song_id: i, title: `Synthetic Track ${String(i).padStart(2, '0')}`, duration: mode === 'demo' && env.DEMO_LOCAL_MEDIA === 'yes' ? 6 : 180 + i, audio_url: mode === 'demo' && env.DEMO_LOCAL_MEDIA === 'yes' ? '/demo/tone.wav' : `https://media.example.test/audio/${i}.mp3`, image_url: mode === 'demo' && env.DEMO_LOCAL_MEDIA === 'yes' ? '/images/default-song.svg' : null, view_count: 100 - i, is_visible: i !== 28, status: i === 26 ? 'pending' : i === 27 ? 'rejected' : 'approved', uploaded_by: 3, lyrics: 'Synthetic fixture', mood: JSON.stringify(['calm']), keywords: JSON.stringify(['synthetic']), vector_embedding: JSON.stringify([i / 28, 0.5]), ...times };
      }), options);
      await q.bulkInsert('song_artists', Array.from({ length: 28 }, (_, i) => ({ song_id: i + 1, artist_id: i % 3 + 1 })), options);
      await q.bulkInsert('song_genres', Array.from({ length: 28 }, (_, i) => ({ song_id: i + 1, genre_id: i % 4 + 1 })), options);
      await q.bulkInsert('playlists', [{ playlist_id: 1, user_id: 1, name: 'Synthetic Public', is_public: true }, { playlist_id: 2, user_id: 2, name: 'Synthetic Private', is_public: false }].map((row) => ({ ...row, type: 'NORMAL', ...times })), options);
      await q.bulkInsert('playlist_songs', [1, 2].flatMap((playlist_id) => [1, 26, 27, 28].map((song_id, i) => ({ playlist_id, song_id, position: i + 1, ...times }))), options);
      await q.bulkInsert('favorites', [1, 26, 27, 28].map((song_id) => ({ user_id: 1, song_id, ...times })), options);
      await q.bulkInsert('ratings', [{ user_id: 1, song_id: 1, score: 5, ...times }], options);
      await q.bulkInsert('UserActivities', [{ user_id: 1, song_id: 1, session_id: 'synthetic-session-1', source: 'search', song_duration: 181, total_listened_time: 60, max_position_reached: 60, created_at: now }], options);
      await q.bulkInsert('song_similarities', [26, 27, 28, 2, 3, 4].map((song_id_2, i) => ({ song_id_1: 1, song_id_2, behavioral_score: 0.9 - i / 20, metadata_score: 0.8, final_score: 0.99 - i / 20, reason: 'Synthetic similarity', detail: JSON.stringify({ synthetic: true }), updated_at: now })), options);
      return { users: 5, songs: 28, publicSongs: 25, playlists: 2, media: 'reserved example.test URLs; no playable audio supplied' };
    });
  } finally { await db.close(); }
}
module.exports = { seed, seedConfig };
