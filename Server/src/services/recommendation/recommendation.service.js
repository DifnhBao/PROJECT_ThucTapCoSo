const { selectSeeds, rankPersonal } = require('./ranking');
const { Op, literal } = require('sequelize');
const { Song, Artist, Genre, Favorite, Rating, UserActivity } = require('../../models');
const { publicSongWhere, requirePublicSong } = require('../../policies/publication.policy');
const { isAdmin } = require('../../policies/user.policy');
const { requirePermission, requireId } = require('../../utils/authorization');
const { AppError } = require('../../utils/app-error');
const repository = require('./snapshot.repository');
const { userSignals } = require('./signals');
const config = require('./config');
const include = [
  { model: Artist, as: 'artists', attributes: ['artist_id', 'name'], through: { attributes: [] } },
  { model: Genre, as: 'genres', attributes: ['genre_id', 'name'], through: { attributes: [] } },
];
const attributes = ['song_id', 'title', 'duration', 'audio_url', 'image_url', 'view_count'];
const boundedLimit = (n) => Math.min(50, Math.max(1, Math.trunc(Number(n)) || 10));
async function getTrendingSongs(limit = 10, excluded = [], userId) {
  const constraints = excluded.length ? { song_id: { [Op.notIn]: excluded } } : {};
  // A bounded history window must not reintroduce explicit dislikes outside that window.
  if (userId) constraints[Op.and] = literal(`NOT EXISTS (SELECT 1 FROM ratings veto WHERE veto.user_id=${requireId(userId)} AND veto.song_id=Song.song_id AND veto.score<=${config.lowRating})`);
  const songs = await Song.findAll({ where: publicSongWhere(constraints),
    attributes, include, limit: boundedLimit(limit), order: [['view_count', 'DESC'], ['song_id', 'ASC']] });
  return songs.map((song) => ({ song, accumulated_score: null, reason: 'Bài hát công khai đang thịnh hành.',
    endorsed_by_count: 0, is_discovery_candidate: true }));
}
async function hydrate(items, limit) {
  if (!items.length) return [];
  const songs = await Song.findAll({ where: publicSongWhere({ song_id: { [Op.in]: items.map((i) => i.song_id) } }), attributes, include });
  const byId = new Map(songs.map((s) => [Number(s.song_id), s]));
  return items.filter((i) => byId.has(i.song_id)).slice(0, boundedLimit(limit)).map(({ song_id, ...item }) => ({ ...item, song: byId.get(song_id) }));
}
async function getSimilarSongs(songId, limit = 10) {
  songId = requireId(songId);
  await requirePublicSong(songId, { attributes: ['song_id'] });
  const rows = await repository.readNeighbors([songId]);
  return hydrate(rows.filter((r) => Number(r.song_id) !== songId)
    .sort((a, b) => b.final_score - a.final_score || a.song_id - b.song_id)
    .map((r) => ({ song_id: Number(r.song_id), final_score: r.final_score, metadata_score: r.metadata_score,
      behavioral_score: r.behavioral_score, reason: r.reason,
      detail: { algorithm_version: r.algorithm_version, run_id: r.run_id } })), limit);
}
async function getRecommendationsForUser(userId, limit = 10) {
  userId = requireId(userId);
  const [activities, favorites, ratings] = await Promise.all([
    UserActivity.findAll({ where: { user_id: userId, event_version: 1, qualified: true },
      attributes: ['song_id', 'event_version', 'qualified', 'song_duration', 'total_listened_time'],
      order: [['id', 'DESC']], limit: config.maxUserSignals }),
    Favorite.findAll({ where: { user_id: userId }, attributes: ['song_id'], order: [['song_id', 'ASC']], limit: config.maxUserSignals }),
    Rating.findAll({ where: { user_id: userId }, attributes: ['song_id', 'score'], order: [['song_id', 'ASC']], limit: config.maxUserSignals }),
  ]);
  const { weights, rejected } = userSignals(activities, favorites, ratings);
  const seeds = selectSeeds(weights);
  if (!seeds.length) return getTrendingSongs(limit, [...rejected], userId);
  const rows = await repository.readNeighbors(seeds.map(([id]) => id));
  const checkedIds = [...new Set([...weights.keys(), ...rows.map((r) => Number(r.song_id))])];
  const vetoes = await Rating.findAll({ where: { user_id: userId, score: { [Op.lte]: config.lowRating }, song_id: { [Op.in]: checkedIds } },
    attributes: ['song_id'], limit: checkedIds.length });
  for (const row of vetoes) rejected.add(Number(row.song_id));
  const items = rankPersonal(rows, weights, rejected);
  const result = await hydrate(items, limit);
  return result.length ? result : getTrendingSongs(limit, [...weights.keys(), ...rejected], userId);
}
async function getSongPairDebug(a, b, actor) {
  requirePermission(isAdmin(actor)); a = requireId(a); b = requireId(b);
  await requirePublicSong(a, { attributes: ['song_id'] });
  await requirePublicSong(b, { attributes: ['song_id'] });
  const row = (await repository.readNeighbors([a])).find((r) => Number(r.song_id) === b);
  if (!row) throw new AppError('Pair is not present in the active top-K snapshot.', 404, 'SNAPSHOT_PAIR_NOT_FOUND');
  return { ...row, source: 'snapshot' };
}
module.exports = { getSimilarSongs, getRecommendationsForUser, getSongPairDebug, getTrendingSongs };
