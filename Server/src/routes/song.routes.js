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

// user upload nhạc (phải đặt TRƯỚC /:songId/view)
router.post(
  "/upload",
  protect,
  upload.fields([
    { name: "audioFile", maxCount: 1 },
    { name: "imageFile", maxCount: 1 },
  ]),
  songController.userUploadSong,
);

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

// duyệt bài hát
router.get(
  "/pending",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.getPendingSongs,
);

router.get(
  "/pending/count",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.getPendingSongsCount,
);

router.patch(
  "/:id/approve",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.approveSong,
);

router.patch(
  "/:id/reject",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  songController.rejectSong,
);

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

module.exports = router;
