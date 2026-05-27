const { where } = require("sequelize");
const { Playlist, Song, User, PlaylistSong, Artist } = require("../models");

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
  const playlist = await Playlist.findOne({
    where: {
      playlist_id: playlistId,
      user_id: userId,
    },
  });

  if (!playlist) {
    throw new Error("Playlist không tồn tại hoặc không thuộc về bạn.");
  }

  const song = await Song.findByPk(songId);

  if (!song) {
    throw new Error("Bài hát không tồn tại.");
  }

  const existed = await PlaylistSong.findOne({
    where: {
      playlist_id: playlistId,
      song_id: songId,
    },
  });

  if (existed) throw new Error("Bài hát đã có trong playlist.");

  // Lay vi tri cuoi cung
  const lastSong = await PlaylistSong.findOne({
    where: { playlist_id: playlistId },
    order: [["position", "DESC"]],
  });

  const nextPosition = lastSong ? lastSong.position + 1 : 1;

  const playlistSong = await PlaylistSong.create({
    playlist_id: playlistId,
    song_id: songId,
    position: nextPosition,
  });

  return playlistSong;
};

const getPlaylistDetail = async (playlistId) => {
  return await Playlist.findByPk(playlistId, {
    include: [
      {
        model: Song,
        as: "songs",
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
};

// Xóa bài hát khỏi playlist
const removeSongFromPlaylist = async (userId, playlistId, songId) => {
  const playlist = await Playlist.findOne({
    where: {
      playlist_id: playlistId,
      user_id: userId,
    },
  });

  if (!playlist) {
    throw new Error("Playlist không tồn tại hoặc không thuộc về bạn.");
  }

  return await PlaylistSong.destroy({
    where: {
      playlist_id: playlistId,
      song_id: songId,
    },
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
      },
    ],
  });

  return playlists;
};

// Xoa playlist
const deletePlaylist = async (userId, playlistId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw new Error("Không tìm thấy playlist.");

  if (playlist.user_id !== userId) {
    throw new Error("Bạn không có quyền xóa playlist này.");
  }

  // Xóa các bản ghi liên kết trong bảng PlaylistSong trước
  await PlaylistSong.destroy({
    where: {
      playlist_id: playlistId,
    },
  });

  await playlist.destroy();
  return {
    message: "Đã xóa thành công playlist.",
  };
};

// Lay daily mix hom nay
async function getTodayDailyMix() {
  return Playlist.findOne({
    where: {
      type: "DAILY_MIX",
      mix_date: new Date().toISOString().slice(0, 10),
    },
    include: [
      {
        model: Song,
        as: "songs",
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
