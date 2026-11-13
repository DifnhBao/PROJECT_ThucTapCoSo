const { guard } = require('../midlewares/security');
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
router.get("/songs/:songId/similar", guard("recommendation"), recommendationController.getSimilarSongs);

// 3. Lấy danh sách bài hát gợi ý cho User (Yêu cầu đăng nhập)
router.get("/me", protect, guard("recommendation"), recommendationController.getRecommendationsForUser);

// 4. Internal debug only; never expose the matrix or unpublished media publicly.
router.get("/debug/song-pair", protectAdmin, authorizeRoles("admin", "super_admin"), recommendationController.getSongPairDebug);

module.exports = router;
