const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendation.controller");
const { protect, protectAdmin, authorizeRoles } = require("../midlewares/auth.midleware");

// 1. Trigger rebuild ma trận tương đồng (Chỉ dành cho Admin / Super Admin)
router.post(
  "/rebuild-similarity",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  recommendationController.rebuildSimilarity
);

// 2. Lấy danh sách bài hát tương tự bài hát hiện tại (Public)
router.get("/songs/:songId/similar", recommendationController.getSimilarSongs);

// 3. Lấy danh sách bài hát gợi ý cho User (Yêu cầu đăng nhập)
router.get("/users/:userId", protect, recommendationController.getRecommendationsForUser);

// 4. Debug phân tích điểm tương đồng 2 bài hát (Public để dễ demo local)
router.get("/debug/song-pair", recommendationController.getSongPairDebug);

module.exports = router;
