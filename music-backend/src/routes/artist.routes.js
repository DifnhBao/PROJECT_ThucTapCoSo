const express = require("express");
const router = express.Router();
const artistController = require("../controllers/artist.controller");
const { protect, isAdmin } = require("../midlewares/auth.midleware");

// API tạo nghệ sĩ
// POST /api/artists

router.post("/", protect, isAdmin, artistController.createArtist);

// API lấy tất cả nghệ sĩ
// GET/api/artist

router.get("/", artistController.getAllArtists);
router.get("/:artistId", artistController.getArtistDetail);

module.exports = router;
