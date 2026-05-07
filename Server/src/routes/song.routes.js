const express = require("express");
const router = express.Router();
const songController = require("../controllers/song.controller");
const {
  protect,
  protectAdmin,
  authorizeRoles,
} = require("../midlewares/auth.midleware");
const upload = require("../midlewares/upload.midleware");

// tìm kiếm bài hát
router.get("/search", songController.searchSongs);

/* --- ROUTES FOR USER --- */

// track list hằng ngày
router.get("/", songController.getSongList);
// tăng view
router.post("/:songId/view", protect, songController.increaseView);

/* --- ROUTES FOR ADMIN --- */

// manage song
router.get(
  "/all",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.getAllSongs,
);
// router.get("/:id", songController.getSongById);

// sửa
router.put(
  "/:id",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.updateSongById,
);
// xóa
router.delete(
  "/:id",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.deleteSongById,
);

// Ẩn hiện
router.patch(
  "/:id/toggle-invisibility",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.toggleSongVisibility,
);

// admin up nhạc
router.post(
  "/",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  upload.fields([
    { name: "audioFile", maxCount: 1 },
    { name: "imageFile", maxCount: 1 },
  ]),
  songController.createSong,
);

// admin AUTO up nhạc bằng AI (Nhiều bài cùng lúc)
router.post(
  "/auto-upload",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  upload.array("audioFiles", 20), // Cho phép tối đa 20 file mp3 một lúc
  songController.autoUploadSongs
);

// gọi 1 lần để lấy 200 bài
// router.post("/sync", jamendoController.fetchRandomJamendoTracks);

module.exports = router;
