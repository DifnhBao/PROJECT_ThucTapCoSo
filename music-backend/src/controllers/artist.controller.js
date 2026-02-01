const artistService = require("../services/artist.service");

const getAllArtists = async (req, res, next) => {
  try {
    const artists = await artistService.getAllArtists();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nghệ sĩ thành công.",
      data: artists,
    });
  } catch (error) {
    console.error("ArtistController error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch artists",
    });
  }
};

const getArtistDetail = async (req, res) => {
  try {
    const { artistId } = req.params;

    const artist = await artistService.getArtistById(artistId);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết nghệ sĩ thành công.",
      data: artist,
    });
  } catch (error) {
    console.error("Get artist detail error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch artist detail",
    });
  }
};

const createArtist = async (req, res, next) => {
  try {
    const artistData = req.body;
    const newArtist = await artistService.createArtist(artistData);

    res.status(200).json({
      message: "Tạo nghệ sĩ thành công.",
      data: newArtist,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllArtists,
  getArtistDetail,
  createArtist,
};
