const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlist.controller");
const dailyMixController = require("../controllers/dailyMix.controller");
const { protect } = require("../midlewares/auth.midleware");
const { route } = require("./auth.routes");

// 6. Lay daily mix hom nay
// router.get("/daily-mix/today", playlistController.getDailyMix);
// lấy danh sách playlist
// router.get("/daily-mixes", dailyMixController.getDailyMixList);
//lấy danh sách bài hát trong playlist
// router.get("/daily-mix/:playlistId", dailyMixController.getDailyMixDetail);

// 1. Tao Playlist
router.post("/", protect, playlistController.createPlaylist);

// 2. Lay tat ca playlist
router.get("/me", protect, playlistController.getMyPlaylists);

// 4. Them bai hat vao playlist
router.post(
  "/:playlistId/songs",
  protect,
  playlistController.addSongToPlaylist,
);

// Lấy danh sách phát của playlist
router.get("/:playlistId", playlistController.getPlaylistDetail);

// 5. Xoa bai hat khoi playlist
router.delete(
  "/:playlistId/songs/:songId",
  protect,
  playlistController.removeSongFromPlaylist,
);

// 3. Xoa playlist
router.delete("/:playlistId", protect, playlistController.deletePlaylist);

module.exports = router;
