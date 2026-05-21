const recommendationService = require("../services/recommendation/recommendation.service");
const hybridSimilarityService = require("../services/recommendation/hybridSimilarity.service");

/**
 * Trigger rebuild toàn bộ ma trận tương đồng song_similarities
 * POST /api/recommendations/rebuild-similarity
 */
const rebuildSimilarity = async (req, res, next) => {
  try {
    const limit = parseInt(req.body.limit || req.query.limit) || 200;
    
    // Gọi service chạy nền/đồng bộ, phản hồi khi hoàn thành
    const result = await hybridSimilarityService.rebuildAllSongSimilarities({ limit });
    
    res.status(200).json({
      success: true,
      message: "Tính toán và cập nhật ma trận tương đồng thành công!",
      data: result
    });
  } catch (error) {
    console.error("Rebuild Similarity Error:", error);
    next(error);
  }
};

/**
 * Lấy danh sách các bài hát tương tự bài hát hiện tại
 * GET /api/recommendations/songs/:songId/similar?limit=10
 */
const getSimilarSongs = async (req, res, next) => {
  try {
    const songId = parseInt(req.params.songId);
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(songId)) {
      return res.status(400).json({ success: false, message: "ID bài hát không hợp lệ." });
    }

    const data = await recommendationService.getSimilarSongs(songId, limit);
    
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
 * GET /api/recommendations/users/:userId?limit=10
 */
const getRecommendationsForUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: "ID người dùng không hợp lệ." });
    }

    const data = await recommendationService.getRecommendationsForUser(userId, limit);

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
    const songA = parseInt(req.query.songA);
    const songB = parseInt(req.query.songB);

    if (isNaN(songA) || isNaN(songB)) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp đầy đủ ID hai bài hát (songA và songB) dạng số."
      });
    }

    const data = await recommendationService.getSongPairDebug(songA, songB);

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
