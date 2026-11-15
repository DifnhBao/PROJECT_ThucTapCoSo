const { playlistTransaction } = require('./playlist-transaction');
const { AppError } = require("../utils/app-error");
const { Op } = require("sequelize");
const { Playlist, Song, User, PlaylistSong, Artist } = require("../models");
const { AuthorizationError, requireId } = require("../utils/authorization");
const { publicSongWhere, requirePublicSong } = require("../policies/publication.policy");
const { isAdmin } = require("../policies/user.policy");

async function requireOwnedPlaylist(userId, playlistId, transaction) {
  const playlist = await Playlist.findOne({
    where: { playlist_id: requireId(playlistId), user_id: requireId(userId) },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!playlist) throw new AuthorizationError("Không tìm thấy playlist.", 404, "PLAYLIST_NOT_FOUND");
  return playlist;
}

// Tao playlist moi
const createPlaylist = async (userId, name, description) => {
  const newPlaylist = await Playlist.create({
    name,
    description,
    user_id: userId,
  });

  return newPlaylist;
};

// Them bai hat vao playlist
const addSongToPlaylist = async (userId, playlistId, songId) => {
  playlistId = requireId(playlistId); songId = requireId(songId);
  return playlistTransaction(async (transaction) => {
    await requireOwnedPlaylist(userId, playlistId, transaction);
    // A locking current read prevents publication changes before this insert commits.
    await requirePublicSong(songId, { transaction, lock: transaction.LOCK.SHARE });
    const existed = await PlaylistSong.findOne({ where: { playlist_id: playlistId, song_id: songId }, transaction, lock: transaction.LOCK.UPDATE });
    if (existed) throw new AppError('Bài hát đã có trong playlist.', 409, 'PLAYLIST_SONG_EXISTS');
    const lastSong = await PlaylistSong.findOne({ where: { playlist_id: playlistId }, order: [['position', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    const position = lastSong ? Number(lastSong.position) : 0;
    if (!Number.isSafeInteger(position) || position < 0 || position >= 2147483647) throw new AppError('Không thể thêm vị trí mới vào playlist.', 409, 'PLAYLIST_POSITION_LIMIT');
    return PlaylistSong.create({ playlist_id: playlistId, song_id: songId, position: position + 1 }, { transaction });
  });
};

const getPlaylistDetail = async (playlistId, actor = null) => {
  const access = isAdmin(actor) ? {} : actor
    ? { [Op.or]: [{ is_public: true }, { user_id: actor.userId }] }
    : { is_public: true };
  const playlist = await Playlist.findOne({
    where: { playlist_id: requireId(playlistId), ...access },
    include: [
      {
        model: Song,
        as: "songs",
        where: publicSongWhere(),
        required: false,
        include: [
          {
            model: Artist,
            as: "artists",
            through: { attributes: [] },
          },
        ],
        through: { attributes: ["position"] },
      },
    ],
    order: [[{ model: Song, as: "songs" }, PlaylistSong, "position", "ASC"]],
  });
  if (!playlist) throw new AuthorizationError("Không tìm thấy playlist.", 404, "PLAYLIST_NOT_FOUND");
  return playlist;
};

// Xóa bài hát khỏi playlist
const removeSongFromPlaylist = async (userId, playlistId, songId) => {
  playlistId = requireId(playlistId); songId = requireId(songId);
  return playlistTransaction(async (transaction) => {
    await requireOwnedPlaylist(userId, playlistId, transaction);
    // Removing an existing hidden song is allowed for its owner; it does not publish it.
    return PlaylistSong.destroy({ where: { playlist_id: playlistId, song_id: songId }, transaction });
  });
};

// ============================

// Lay tat ca playlist cua user dang dang nhap
const getMyPlaylists = async (userId) => {
  const playlists = await Playlist.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Song,
        as: "songs",
        through: { attributes: [] },
        attributes: ["song_id", "title", "audio_url", "duration", "image_url"],
        where: publicSongWhere(),
        required: false,
      },
    ],
  });

  return playlists;
};

// Xoa playlist
const deletePlaylist = async (userId, playlistId) => {
  playlistId = requireId(playlistId);
  return playlistTransaction(async (transaction) => {
    const playlist = await requireOwnedPlaylist(userId, playlistId, transaction);
    await PlaylistSong.destroy({ where: { playlist_id: playlistId }, transaction });
    await playlist.destroy({ transaction });
    return { message: 'Đã xóa thành công playlist.' };
  });
};

// Lay daily mix hom nay
async function getTodayDailyMix() {
  return Playlist.findOne({
    where: {
      type: "DAILY_MIX",
      is_public: true,
      mix_date: new Date().toISOString().slice(0, 10),
    },
    include: [
      {
        model: Song,
        as: "songs",
        where: publicSongWhere(),
        required: false,
        through: {
          attributes: [],
        },
      },
    ],
  });
}

module.exports = {
  createPlaylist,
  getMyPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
  getTodayDailyMix,
  getPlaylistDetail,
};
