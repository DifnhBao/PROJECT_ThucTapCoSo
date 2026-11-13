const { AppError } = require('../utils/app-error');
const { where } = require("sequelize");
const ratingService = require("../services/rating.service"); // Gọi Service vào

exports.rateSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId, score } = req.body;

    if (score < 1 || score > 5) {
      throw new AppError("Điểm phải từ 1 đến 5", 400, 'VALIDATION_ERROR');
    }

    const { rating, created } = await ratingService.rateSong(
      userId,
      songId,
      score,
    );

    return res.status(200).json({
      message: created ? "Đánh giá thành công" : "Cập nhật đánh giá thành công",
      data: rating,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSongRatingSummary = async (req, res, next) => {
  try {
    const { songId } = req.params;

    const data = await ratingService.getSongRatingSummary(songId);

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getMyRating = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new AppError("Chưa đăng nhập", 401, 'AUTH_REQUIRED');
    }

    const { songId } = req.params;

    const rating = await ratingService.getUserRatingForSong(userId, songId);

    return res.status(200).json({
      rating,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.ratings);
