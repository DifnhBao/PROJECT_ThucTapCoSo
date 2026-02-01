const express = require("express");
const router = express.Router();
const songController = require("../controllers/song.controller");
const jamendoController = require("../controllers/jamendo.controller");
const {
  protect,
  isAdmin,
  protectAdmin,
} = require("../midlewares/auth.midleware");
const upload = require("../midlewares/upload.midleware");


router.get("/search", songController.searchSongs);

/* --- ROUTES FOR USER --- */

// lấy danh sách bài hát yêu thích
router.get("/me/favorites", protect, songController.getLikedSongs);

router.get("/:id/like-status", protect, songController.getLikeStatus);
// Like
router.post("/:id/like", protect, songController.likeSong);
// Unlike
router.delete("/:id/like", protect, songController.unlikeSong);

// track list hằng ngày
router.get("/", songController.getSongList);

// tăng view
router.post("/:songId/view", songController.increaseView);

// admin up nhạc
router.post(
  "/",
  protectAdmin,
  upload.single("audioFile"),
  songController.createSong
);

/* --- ROUTES FOR ADMIN --- */

// manage song
router.get("/all", protectAdmin, songController.getAllSongs);
// router.get("/:id", songController.getSongById);

// sửa
router.put("/:id", protectAdmin, songController.updateSongById);
// xóa
router.delete("/:id", protectAdmin, songController.deleteSongById);

// Ẩn hiện
router.patch(
  "/:id/toggle-invisibility",
  protectAdmin,
  songController.toggleSongVisibility
);

// gọi 1 lần để lấy 200 bài
// router.post("/sync", jamendoController.fetchRandomJamendoTracks);

module.exports = router;
