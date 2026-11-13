const { AppError } = require('../utils/app-error');
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
    next(error);
  }
};

const getArtistDetail = async (req, res, next) => {
  try {
    const { artistId } = req.params;

    const artist = await artistService.getArtistById(artistId);

    if (!artist) {
      throw new AppError("Artist not found", 404, 'RESOURCE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết nghệ sĩ thành công.",
      data: artist,
    });
  } catch (error) {
    next(error);
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

const getTopArtists = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const topArtists = await artistService.getTopArtists(limit);

    res.status(200).json({
      success: true,
      message: "Lấy top nghệ sĩ thành công.",
      data: topArtists,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllArtists,
  getArtistDetail,
  createArtist,
  getTopArtists,
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.artists);
