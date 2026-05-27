const { Favorite, Song, Artist } = require("../models");

const toggleLikeSong = async (userId, songId) => {
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Bài hát không tồn tại.");
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
  const existed = await Favorite.findOne({
    where: { user_id: userId, song_id: songId },
  });

  return {
    song_id: songId,
    liked: !!existed,
  };
};

const countLikes = async (songId) => {
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
        where: { is_visible: true },
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
