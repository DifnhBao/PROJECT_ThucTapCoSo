const { AppError } = require("../utils/app-error");
const { Favorite, Song, Artist } = require("../models");
const { publicSongWhere, requirePublicSong } = require("../policies/publication.policy");

const toggleLikeSong = async (userId, songId) => {
  const song = await requirePublicSong(songId);
  if (!song) {
    throw new AppError("Bài hát không tồn tại.", 404, "SONG_NOT_FOUND");
  }

  const existed = await Favorite.findOne({
    where: { user_id: userId, song_id: songId },
  });

  if (existed) {
    await existed.destroy();

    return {
      liked: false,
      song_id: songId,
      message: "Bài hát đã được bỏ thích.",
    };
  }

  try {
    await Favorite.create({
      user_id: userId,
      song_id: songId,
    });

    return {
      liked: true,
      song_id: songId,
      message: "Đã thích bài hát.",
    };
  } catch (error) {
    // Nếu lỗi là do click đúp tạo ra bản ghi trùng, ta bỏ qua và coi như thành công
    if (error.name === "SequelizeUniqueConstraintError") {
      return {
        liked: true,
        song_id: songId,
        message: "Đã thích bài hát.",
      };
    }
    throw error;
  }
};

const getLikeStatus = async (userId, songId) => {
  await requirePublicSong(songId, { attributes: ["song_id"] });
  const existed = await Favorite.findOne({
    where: { user_id: userId, song_id: songId },
  });

  return {
    song_id: songId,
    liked: !!existed,
  };
};

const countLikes = async (songId) => {
  await requirePublicSong(songId, { attributes: ["song_id"] });
  const total = await Favorite.count({
    where: { song_id: songId },
  });

  return total;
};

const getMyFavoriteSongs = async (userId, page, limit) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Favorite.findAndCountAll({
    where: { user_id: userId },
    include: [
      {
        model: Song,
        as: "song",
        where: publicSongWhere(),
        required: true,
        include: [
          {
            model: Artist,
            as: "artists",
            attributes: ["artist_id", "name"],
            through: { attributes: [] },
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    offset,
    limit,
  });

  return {
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

module.exports = {
  toggleLikeSong,
  getLikeStatus,
  countLikes,
  getMyFavoriteSongs,
};
