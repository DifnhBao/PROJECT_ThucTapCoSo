const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artist.controller");
const { protectAdmin, authorizeRoles } = require("../midlewares/auth.midleware");

// API tạo nghệ sĩ
// POST /api/artists

router.post(
  "/",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  artistController.createArtist,
);

// API lấy tất cả nghệ sĩ
router.get("/", artistController.getAllArtists);

// API lấy top nghệ sĩ
router.get("/top", artistController.getTopArtists);

// API lấy chi tiết nghệ sĩ
router.get("/:artistId", artistController.getArtistDetail);

module.exports = router;
