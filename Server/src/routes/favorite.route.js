const express = require("express");
const router = express.Router();

const favoriteController = require("../controllers/favorite.controller");
const { protect } = require("../midlewares/auth.midleware");

// Like bài hát
router.post("/:id/like", protect, favoriteController.toggleLikeSong);
router.get("/:id/like-status", protect, favoriteController.getLikeStatus);

// Lấy danh sách bài hát yêu thích
router.get("/me", protect, favoriteController.getMyFavoriteSongs);

module.exports = router;
