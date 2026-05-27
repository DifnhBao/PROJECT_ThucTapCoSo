const { where } = require("sequelize");
const ratingService = require("../services/rating.service"); // Gọi Service vào

exports.rateSong = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { songId, score } = req.body;

    if (score < 1 || score > 5) {
      return res.status(400).json({ message: "Điểm phải từ 1 đến 5" });
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
    console.error("rateSong error:", error);

    if (error.message === "INVALID_SCORE") {
      return res.status(400).json({
        message: "Điểm rating phải từ 1 đến 5",
      });
    }

    if (error.message === "SONG_NOT_FOUND") {
      return res.status(404).json({
        message: "Bài hát không tồn tại",
      });
    }

    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};

exports.getSongRatingSummary = async (req, res) => {
  try {
    const { songId } = req.params;

    const data = await ratingService.getSongRatingSummary(songId);

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};

exports.getMyRating = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Chưa đăng nhập",
      });
    }

    const { songId } = req.params;

    const rating = await ratingService.getUserRatingForSong(userId, songId);

    return res.status(200).json({
      rating,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};
