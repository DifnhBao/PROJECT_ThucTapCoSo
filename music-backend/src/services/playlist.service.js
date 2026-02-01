const { Playlist, Song, User } = require("../models");

// Tao playlist moi
const createPlaylist = async (userId, playlistData) => {
  const { title, description } = playlistData;

  const newPlaylist = await Playlist.create({
    title,
    description,
    user_id: userId,
  });

  return newPlaylist;
};

// Lay tat ca playlist cua user dang dang nhap
const getMyPlaylists = async (userId) => {
  const playlists = await Playlist.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Song,
        through: { attributes: [] }, // Khong lay t.tin bang trung gian
        attributes: ["song_id", "title", "audio_url", "duration"],
      },
    ],
  });

  return playlists;
};

// Them bai hat vao playlist
const addSongToPlaylist = async (userId, playlistId, songId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw new Error("Không tìm thấy playlist.");

  if (playlist.user_id !== userId) {
    throw new Error("Bạn không có quyền chỉnh sửa playlist này.");
  }

  // Tim bai hat
  const song = await Song.findByPk(songId);
  if (!song) throw new Error("Không tìm thấy bài hát.");

  // Thêm bài hát
  await playlist.addSong(song);

  return {
    message: "Đã thêm bài hát thành công vào playlist.",
  };
};

// Xóa bài hát khỏi playlist
const removeSongFromPlaylist = async (userId, playlistId, songId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw new Error("Không tìm thấy playlist.");

  if (playlist.user_id !== userId) {
    throw new Error("Bạn không có quyền chỉnh sửa playlist này.");
  }

  const song = await Song.findByPk(songId);
  if (!song) throw new Error("Không tìm thấy bài hát.");

  await playlist.removeSong(song);

  return {
    message: "Đã xóa bài hát khỏi playlist.",
  };
};

// Xoa playlist
const deletePlaylist = async (userId, playlistId) => {
  const playlist = await Playlist.findByPk(playlistId);
  if (!playlist) throw new Error("Không tìm thấy playlist.");

  if (playlist.user_id !== userId) {
    throw new Error("Bạn không có quyền xóa playlist này.");
  }

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
};
