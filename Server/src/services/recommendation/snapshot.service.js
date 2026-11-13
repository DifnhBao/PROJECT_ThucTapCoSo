const { buildEdges, rank, metadataFromSong } = require('./ranking');
const { randomUUID } = require('node:crypto');
const { QueryTypes, Op, Transaction } = require('sequelize');
const { sequelize, Song, Genre, Artist, UserActivity, Favorite, Rating } = require('../../models');
const { AppError } = require('../../utils/app-error');
const { publicSongWhere } = require('../../policies/publication.policy');
const { interactionMatrix } = require('./signals');
const config = require('./config');


async function rebuild({ beforePublish } = {}) {
  const started = performance.now(), runId = randomUUID();
  try {
    return await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async (transaction) => {
      const options = { transaction, type: QueryTypes.SELECT };
      // Cross-process lock, released on commit/rollback/connection loss. Reject a concurrent CLI.
      await sequelize.query('SELECT id FROM recommendation_state WHERE id=1 FOR UPDATE NOWAIT', options);
      const songs = await Song.findAll({ where: publicSongWhere(), order: [['song_id', 'ASC']], limit: config.maxCatalog + 1,
        attributes: ['song_id', 'title', 'duration', 'mood', 'keywords', 'lyrics'],
        include: [{ model: Artist, as: 'artists', through: { attributes: [] }, attributes: ['name'] },
          { model: Genre, as: 'genres', through: { attributes: [] }, attributes: ['name'] }], transaction });
      if (songs.length > config.maxCatalog) throw new AppError('Catalog exceeds offline rebuild limit.', 409, 'RECOMMENDATION_CAPACITY');
      const ids = songs.map((s) => s.song_id);
      const where = { song_id: { [Op.in]: ids } };
      const signals = ids.length ? await Promise.all([UserActivity, Favorite, Rating].map((model) => model.findAll({
        where, limit: config.maxSignals + 1, order: [[model.primaryKeyAttribute, 'ASC']], transaction,
      }))) : [[], [], []];
      if (signals.some((rows) => rows.length > config.maxSignals)) throw new AppError('Interactions exceed offline rebuild limit.', 409, 'RECOMMENDATION_CAPACITY');
      if (songs.some((s) => (s.lyrics || '').length > config.maxLyrics)) throw new AppError('Lyrics exceed rebuild limit.', 409, 'RECOMMENDATION_CAPACITY');
      const metadata = songs.map(metadataFromSong);
      const edges = buildEdges(metadata, interactionMatrix(...signals));
      await sequelize.query(`INSERT INTO recommendation_runs (run_id, algorithm_version, config, song_count, edge_count, created_at)
        VALUES (:id,:version,:config,:songs,:edges,NOW(3))`, { transaction, replacements: {
        id: runId, version: config.version, config: JSON.stringify(config), songs: songs.length, edges: edges.length,
      } });
      const fields = ['seed_id', 'song_id', 'final_score', 'metadata_score', 'behavioral_score', 'reason', 'detail'];
      for (let offset = 0; offset < edges.length; offset += 200) {
        const batch = edges.slice(offset, offset + 200), replacements = { runId };
        const values = batch.map((row, i) => `(:runId,${fields.map((f) => { const k = `${f}${i}`; replacements[k] = row[f]; return `:${k}`; }).join(',')})`);
        await sequelize.query(`INSERT INTO recommendation_neighbors (run_id,${fields.join(',')}) VALUES ${values.join(',')}`, { transaction, replacements });
      }
      const [check] = await sequelize.query('SELECT COUNT(*) AS count FROM recommendation_neighbors WHERE run_id=:id', { ...options, replacements: { id: runId } });
      if (Number(check.count) !== edges.length || edges.length > songs.length * config.topK) throw new Error('Snapshot validation failed');
      // Test seam for crash/rollback and concurrent-reader assertions; CLI never exposes this option.
      if (beforePublish) await beforePublish({ runId, transaction });
      await sequelize.query('UPDATE recommendation_state SET active_run_id=:id WHERE id=1', { transaction, replacements: { id: runId } });
      return { run_id: runId, algorithm_version: config.version, song_count: songs.length, edge_count: edges.length,
        interaction_count: signals.reduce((n, rows) => n + rows.length, 0), duration_ms: Math.round(performance.now() - started) };
    });
  } catch (error) {
    if ([3572, 1205, 1213].includes(error.original?.errno)) throw new AppError('Another rebuild is running; retry offline later.', 409, 'REBUILD_BUSY');
    throw error;
  }
}
module.exports = { rebuild, buildEdges, rank };
