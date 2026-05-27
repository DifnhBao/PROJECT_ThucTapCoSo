const db = require("../models");
const { Rating, Song, sequelize } = require("../models");

const rateSong = async (userId, songId, score) => {
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Không tìm thấy bài hát");
  }

  const [rating, created] = await Rating.findOrCreate({
    where: { user_id: userId, song_id: songId },
    defaults: { user_id: userId, song_id: songId, score },
  });

  if (!created) {
    rating.score = score;
    await rating.save();
  }

  return {
    rating,
    created,
  };
};

// Hàm lấy điểm trung bình
const getSongRatingSummary = async (songId) => {
  const result = await Rating.findOne({
    where: { song_id: songId },
    attributes: [
      [sequelize.fn("AVG", sequelize.col("score")), "averageRating"],
      [sequelize.fn("COUNT", sequelize.col("rating_id")), "totalRatings"],
    ],
    raw: true,
  });

  return {
    song_id: songId,
    averageRating: Number(result?.averageRating || 0),
    totalRatings: Number(result?.totalRatings || 0),
  };
};

const getUserRatingForSong = async (userId, songId) => {
  const rating = await Rating.findOne({
    where: { user_id: userId, song_id: songId },
    attributes: ["score"],
    raw: true,
  });

  return rating ? rating.score : null;
};

module.exports = {
  rateSong,
  getSongRatingSummary,
  getUserRatingForSong,
};
