const { z } = require('zod');
const { validatePassword } = require('../utils/passwordValidator');
const integer = (minimum = 1, maximum = Number.MAX_SAFE_INTEGER) => z.number().int().min(minimum).max(maximum);
// Only decimal strings at URL/multipart boundaries; no boolean/array/empty-string coercion.
const decimal = (schema) => z.preprocess((value) => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value, schema);
const id = decimal(integer(1, 2147483647));
const text = (max) => z.string().trim().max(max);
const password = z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72);
const newPassword = password.refine((value) => !validatePassword(value));
const empty = z.strictObject({});
const page = (limit = 20) => z.strictObject({ page: decimal(integer(1, 1000000)).default(1), limit: decimal(integer(1, 100)).default(limit) });
const names = (maxTotal, maxName) => text(maxTotal).refine((value) => value.split(',').every((item) => item.trim().length <= maxName));
const songMetadata = { title: text(255).min(1), artist: names(1000, 255).optional(), genre: names(500, 100).optional(), duration: integer(0, 86400).optional() };
const multipartMetadata = z.strictObject({ ...songMetadata, duration: decimal(integer(0, 86400)).optional() });
const profile = z.strictObject({ firstName: text(100).nullable().optional(), lastName: text(100).nullable().optional(), gender: z.enum(['male', 'female', 'other', '']).nullable().optional(), dateOfBirth: z.union([z.iso.date(), z.literal('')]).nullable().optional(), phone: z.string().max(20).regex(/^[0-9+\-()\s]*$/).nullable().optional(), address: text(255).nullable().optional() });
const credentials = z.strictObject({ username: text(100).min(1), password });
const registration = z.strictObject({ username: text(100).min(1), email: z.email().max(100), password: newPassword });
const limit = z.strictObject({ limit: decimal(integer(1, 100)).default(10) });
const activity = z.strictObject({ song_id: integer(1, 2147483647), event_version: z.literal(1), session_id: z.uuid(), source: z.enum(['search', 'playlist', 'recommendation', 'radio']), exit_reason: z.enum(['ended', 'skipped', 'tab_closed']), song_duration: z.number().min(0).max(86400), total_listened_time: z.number().min(0).max(86400), max_position_reached: z.number().min(0).max(86400).default(0), play_pause_count: integer(0, 32767).default(0), seek_count: integer(0, 32767).default(0) }).refine((data) => data.max_position_reached <= data.song_duration, { path: ['max_position_reached'] });

// Every mounted controller has an explicit entry; unspecified bodies/queries are empty-only.
const contracts = {
  media: { readMedia: {} },
  songs: {
    createSong: { body: multipartMetadata }, userUploadSong: { body: multipartMetadata },
    getAllSongs: { query: page(10).extend({ search: text(200).default('') }) },
    getSongList: { query: page(20) }, getPendingSongs: { query: page(20) },
    searchSongs: { query: z.strictObject({ q: text(200).default(''), limit: decimal(integer(1, 100)).default(10) }) },
    updateSongById: { body: z.strictObject({ ...songMetadata, title: songMetadata.title.optional(), is_visible: z.boolean().optional(), status: z.enum(['pending', 'approved', 'rejected']).optional() }).refine((data) => Object.keys(data).length > 0) },
    getSongById: {}, getSongPreview: {}, deleteSongById: {}, toggleSongVisibility: {}, increaseView: {}, getPendingSongsCount: {}, approveSong: {}, rejectSong: {},
  },
  playlists: { createPlaylist: { body: z.strictObject({ name: text(255).min(1), description: text(2000).optional() }) }, addSongToPlaylist: { body: z.strictObject({ songId: integer(1, 2147483647) }) }, getMyPlaylists: {}, getPlaylistDetail: {}, removeSongFromPlaylist: {}, deletePlaylist: {} },
  ratings: { rateSong: { body: z.strictObject({ songId: integer(1, 2147483647), score: integer(1, 5) }) }, getSongRatingSummary: {}, getMyRating: {} },
  favorites: { toggleLikeSong: {}, getLikeStatus: {}, getMyFavoriteSongs: { query: page(10) } },
  artists: { getAllArtists: {}, getArtistDetail: {}, getTopArtists: { query: limit }, createArtist: { body: z.strictObject({ name: text(255).min(1) }) } },
  auth: { register: { body: registration }, login: { body: credentials }, loginAdmin: { body: credentials }, requestRefreshToken: {}, refreshAdminToken: {}, logout: {}, logoutAdmin: {} },
  users: { getUserProfile: {}, updateUserProfile: { body: profile }, uploadAvatar: {}, changeUserPassword: { body: z.strictObject({ oldPassword: password, newPassword }) }, getAllUsers: {}, getAllAdmins: {}, getUserProfileByAdmin: {}, updateUserById: { body: profile }, deleteUserById: {}, resetUserPassword: { body: z.strictObject({ newPassword }) }, addNewAdmin: { body: registration } },
  recommendations: { getSimilarSongs: { query: limit }, getRecommendationsForUser: { query: limit }, getSongPairDebug: { query: z.strictObject({ songA: id, songB: id }) }, rebuildSimilarity: { body: z.strictObject({ limit: decimal(integer(1, 100)).optional() }), query: z.strictObject({ limit: decimal(integer(1, 100)).optional() }) } },
  activity: { logActivity: { body: activity } },
};
module.exports = { contracts, id, empty };
