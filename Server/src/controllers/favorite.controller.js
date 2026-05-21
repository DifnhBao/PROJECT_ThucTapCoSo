const favoriteService = require("../services/favorite.service");

exports.toggleLikeSong = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const songId = Number(req.params.id);

    const result = await favoriteService.toggleLikeSong(userId, songId);

    res.status(200).json(result);
  } catch (error) {
    console.error("toggleLikeSong error:", error);

    if (error.message === "SONG_NOT_FOUND") {
      return res.status(404).json({
        message: "Bài hát không tồn tại",
      });
    }

    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};

exports.getLikeStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = Number(req.params.id);

    const result = await favoriteService.getLikeStatus(userId, songId);

    res.status(200).json(result);
  } catch (error) {
    console.error("getLikeStatus error:", error);

    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};

exports.getMyFavoriteSongs = async (req, res) => {
  try {
    const userId = req.user.userId;

    // query params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await favoriteService.getMyFavoriteSongs(
      userId,
      page,
      limit,
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("getMyFavoriteSongs error:", error);

    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
};
