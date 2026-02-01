const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlist.controller");
const dailyMixController = require("../controllers/dailyMix.controller");
const { protect } = require("../midlewares/auth.midleware");
const { route } = require("./auth.routes");

// 6. Lay daily mix hom nay
// router.get("/daily-mix/today", playlistController.getDailyMix);
// lấy danh sách playlist
router.get("/daily-mixes", dailyMixController.getDailyMixList);
//lấy danh sách bài hát trong playlist
router.get("/daily-mix/:playlistId", dailyMixController.getDailyMixDetail);

router.use(protect);

// 1. Tao Playlist
router.post("/", playlistController.createPlaylist);

// 2. Lay tat ca playlist
router.get("/me", playlistController.getMyPlaylists);

// 3. Xoa playlist
router.delete("/:id", playlistController.deletePlaylist);

// 4. Them bai hat vao playlist
router.post("/:id/songs", playlistController.addSongToPlaylist);

// 5. Xoa bai hat khoi playlist
router.delete("/:id/songs/:songId", playlistController.removeSongFromPlaylist);

module.exports = router;
