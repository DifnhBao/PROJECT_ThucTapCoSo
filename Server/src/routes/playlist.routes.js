const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlist.controller");
const { protect, optionalAuth } = require("../midlewares/auth.midleware");

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
router.get("/:playlistId", optionalAuth, playlistController.getPlaylistDetail);

// 5. Xoa bai hat khoi playlist
router.delete(
  "/:playlistId/songs/:songId",
  protect,
  playlistController.removeSongFromPlaylist,
);

// 3. Xoa playlist
router.delete("/:playlistId", protect, playlistController.deletePlaylist);

module.exports = router;
