const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/rating.controller");

const { protect } = require("../midlewares/auth.midleware");

// User rating bài hát
router.post("/rate", protect, ratingController.rateSong);
// Lấy rating của người dùng cho bài hát
router.get("/song/:songId/my-rating", protect, ratingController.getMyRating);
// Lấy tổng hợp các rating của bài hát
router.get("/song/:songId/summary", ratingController.getSongRatingSummary);

module.exports = router;
