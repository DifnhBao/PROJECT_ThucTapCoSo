const express = require("express");
const router = express.Router();
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const songRoutes = require("./song.routes");
const artistRoutes = require("./artist.routes");
// const genreRoutes = require("./genre.routes");
// const albumRoutes = require("./album.routes");
const playlistRoutes = require("./playlist.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/songs", songRoutes);
router.use("/artists", artistRoutes);
// router.use("/genres", genreRoutes);
// router.use("/albums", albumRoutes);
router.use("/playlists", playlistRoutes);

module.exports = router;
