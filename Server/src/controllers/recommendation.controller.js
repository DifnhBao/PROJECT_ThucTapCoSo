const { AppError } = require('../utils/app-error');
const recommendationService = require("../services/recommendation/recommendation.service");
const { publicRecommendationItem } = require("../policies/publication.policy");
const { requireId } = require("../utils/authorization");

/**
 * Trigger rebuild toàn bộ ma trận tương đồng song_similarities
 * POST /api/recommendations/rebuild-similarity
 */
const rebuildSimilarity = async (req, res, next) => {
  next(new AppError('Online rebuild is disabled. Run npm run recommendations:rebuild in maintenance.', 409, 'OFFLINE_REBUILD_REQUIRED'));
};

/**
 * Lấy danh sách các bài hát tương tự bài hát hiện tại
 * GET /api/recommendations/songs/:songId/similar?limit=10
 */
const getSimilarSongs = async (req, res, next) => {
  try {
    const songId = requireId(req.params.songId);
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(songId)) {
      throw new AppError("ID bài hát không hợp lệ.", 400, 'VALIDATION_ERROR');
    }

    const data = (await recommendationService.getSimilarSongs(songId, limit)).map(publicRecommendationItem);
    
    res.status(200).json({
      success: true,
      message: `Lấy danh sách bài hát tương tự cho bài hát ${songId} thành công.`,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh sách bài hát gợi ý cá nhân hóa cho User
 * GET /api/recommendations/me?limit=10
 */
const getRecommendationsForUser = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(userId)) {
      throw new AppError("ID người dùng không hợp lệ.", 400, 'VALIDATION_ERROR');
    }

    const data = (await recommendationService.getRecommendationsForUser(userId, limit)).map(publicRecommendationItem);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách gợi ý cá nhân hóa thành công.",
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Debug chi tiết điểm tương đồng của 1 cặp bài hát
 * GET /api/recommendations/debug/song-pair?songA=1&songB=2
 */
const getSongPairDebug = async (req, res, next) => {
  try {
    const songA = requireId(req.query.songA);
    const songB = requireId(req.query.songB);

    if (isNaN(songA) || isNaN(songB)) {
      throw new AppError("Cần cung cấp đầy đủ ID hai bài hát (songA và songB) dạng số.", 400, 'VALIDATION_ERROR');
    }

    const data = await recommendationService.getSongPairDebug(songA, songB, req.auth);

    res.status(200).json({
      success: true,
      message: "Phân tích điểm tương đồng Hybrid thành công.",
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rebuildSimilarity,
  getSimilarSongs,
  getRecommendationsForUser,
  getSongPairDebug
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.recommendations);
