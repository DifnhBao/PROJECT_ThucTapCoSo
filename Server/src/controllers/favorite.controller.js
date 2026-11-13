const favoriteService = require("../services/favorite.service");

exports.toggleLikeSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const songId = Number(req.params.id);

    const result = await favoriteService.toggleLikeSong(userId, songId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getLikeStatus = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const songId = Number(req.params.id);

    const result = await favoriteService.getLikeStatus(userId, songId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getMyFavoriteSongs = async (req, res, next) => {
  try {
    const userId = req.auth.userId;

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
    next(error);
  }
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.favorites);
