const { createHash } = require('node:crypto');
const { UniqueConstraintError, Transaction } = require('sequelize');
const { sequelize, UserActivity, Song } = require('../models');
const { AppError } = require('../utils/app-error');
const { contracts } = require('../validation/contracts');
function normalizedEvent(input) {
  const parsed = contracts.activity.logActivity.body.safeParse(input);
  if (!parsed.success) throw new AppError('Sự kiện nghe không hợp lệ.', 400, 'VALIDATION_ERROR');
  return { ...parsed.data, session_id: parsed.data.session_id.toLowerCase() };
}
const digestEvent = (event) => createHash('sha256').update(JSON.stringify(event)).digest('hex');
function result(row) {
  return { event_id: row.event_id, activity_id: String(row.id), qualified: Boolean(row.qualified), song_duration: row.song_duration };
}
function replay(row, digest) {
  if (row.payload_digest !== digest) throw new AppError('UUID đã dùng cho nội dung khác.', 409, 'ACTIVITY_CONFLICT');
  return { created: false, activity: result(row) };
}
async function ingestActivity(userId, input) {
  const event = normalizedEvent(input), digest = digestEvent(event);
  const where = { user_id: userId, event_id: event.session_id };
  try {
    return await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
      const existing = await UserActivity.findOne({ where, transaction });
      if (existing) return replay(existing, digest);
      // Lock publication state and serialize the view_count increment.
      const song = await Song.findByPk(event.song_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!song || song.status !== 'approved' || !song.is_visible) throw new AppError('Không tìm thấy bài hát.', 404, 'SONG_NOT_FOUND');
      const canonical = Number(song.duration);
      const known = Number.isFinite(canonical) && canonical > 0;
      const duration = known ? canonical : event.song_duration;
      if (known && event.max_position_reached > duration + 1) throw new AppError('Vị trí nghe vượt thời lượng bài.', 422, 'INVALID_ACTIVITY');
      // v1: short (<20s) or unknown duration songs never qualify for view_count.
      const qualified = known && duration >= 20 && event.total_listened_time >= 20;
      const row = await UserActivity.create({ ...event, ...where, payload_digest: digest, event_version: 1,
        song_duration: duration, max_position_reached: Math.min(event.max_position_reached, duration), qualified, created_at: new Date() }, { transaction });
      if (qualified) await song.increment('view_count', { by: 1, transaction });
      return { created: true, activity: result(row) };
    }); // Managed transaction resolves after COMMIT, never before DB persistence.
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      // Read the winner after the failed transaction has rolled back.
      const existing = await UserActivity.findOne({ where });
      if (existing) return replay(existing, digest);
    }
    throw error; // DB/commit failures never become a success response.
  }
}
async function getRecentlyPlayed(userId, { limit = 20, cursor } = {}) {
  const { QueryTypes } = require('sequelize');
  const { decodeRecentCursor, encodeRecentCursor } = require('../validation/recent-cursor');
  const boundary = cursor ? decodeRecentCursor(cursor) : null;
  if (cursor && !boundary) throw new AppError('Cursor không hợp lệ.', 400, 'VALIDATION_ERROR');
  // Aggregate before applying the cursor: older plays must not reappear on later pages.
  // idx_user_song_created covers the owner-scoped grouping and MAX timestamp.
  const rows = await sequelize.query(`
    SELECT s.song_id, s.title, s.audio_url, s.image_url, s.duration,
      DATE_FORMAT(recent.last_played, '%Y-%m-%d %H:%i:%s.%f') AS played_at
    FROM (SELECT song_id, MAX(created_at) AS last_played
      FROM UserActivities WHERE user_id = :userId GROUP BY song_id) recent
    INNER JOIN songs s ON s.song_id = recent.song_id
    WHERE s.status = 'approved' AND s.is_visible = 1
      ${boundary ? 'AND (recent.last_played < :time OR (recent.last_played = :time AND s.song_id < :songId))' : ''}
    ORDER BY recent.last_played DESC, s.song_id DESC LIMIT :take`, {
    replacements: { userId, take: limit + 1, ...(boundary ? { time: boundary.time, songId: boundary.id } : {}) }, type: QueryTypes.SELECT,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const { Artist } = require('../models');
  const songs = page.length ? await Song.findAll({ where: { song_id: page.map((row) => row.song_id) }, attributes: ['song_id'],
    include: [{ model: Artist, as: 'artists', attributes: ['artist_id', 'name'], through: { attributes: [] } }] }) : [];
  const artists = new Map(songs.map((song) => [song.song_id, song.toJSON().artists]));
  const last = page.at(-1);
  return { items: page.map(({ played_at, ...song }) => ({ ...song, artists: artists.get(song.song_id) || [], lastPlayedAt: played_at.replace(' ', 'T') + 'Z' })),
    hasMore, nextCursor: hasMore ? encodeRecentCursor(last.played_at, last.song_id) : null };
}
module.exports = { ingestActivity, normalizedEvent, digestEvent, getRecentlyPlayed };
