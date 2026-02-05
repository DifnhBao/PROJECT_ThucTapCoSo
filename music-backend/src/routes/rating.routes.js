const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/rating.controller");

const authMiddleware = require("../midlewares/auth.midleware");

// 1. API Đánh giá (POST)
router.post("/rate", authMiddleware.protect, ratingController.rateSong);

// 2. API Xem điểm (GET)
router.get("/:song_id", ratingController.getSongRating);

module.exports = router;