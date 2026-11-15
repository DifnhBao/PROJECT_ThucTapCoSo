const { AppError } = require('../utils/app-error');
const songService = require("../services/song.service");
const uploads = require('../services/upload.service');

/* --- CONTROLLER FOR USER --- */

const uploadSong = async (req, res, next) => {
  try {
    const result = await uploads.execute(req);
    res.set('Idempotency-Replayed', String(result.replayed));
    res.status(result.replayed ? 200 : 201).json({ message: req.auth.scope === 'user' ? 'Bài hát đã được gửi và đang chờ duyệt.' : 'Upload thành công', data: result.data });
  } catch (error) { next(error); }
};
const createSong = uploadSong;
const userUploadSong = uploadSong;

const getAllSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const result = await songService.getAllSongs({
      page,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bài hát thành công.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const song = await songService.getSongById(id);
    res.status(200).json({
      message: "Lấy bài hát thành công!",
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

const getSongPreview = async (req, res, next) => {
  try {
    const song = await songService.getSongPreview(req.params.id, req.auth);
    res.status(200).json({ data: song });
  } catch (error) {
    next(error);
  }
};

async function getSongList(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await songService.getSongs({ page, limit });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

const increaseView = async (req, res, next) => {
  try {
    const { songId } = req.params;

    // Chỉ tăng view trong MySQL
    const result = await songService.incrementSongView(songId);

    return res.status(200).json({
      success: true,
      message: "View increased in MySQL",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/* --- CONTROLLER FOR ADMIN */

const updateSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedSong = await songService.updateSongById(id, updateData);

    res.status(200).json({
      message: "Admin cập nhật thành công.",
      data: updatedSong,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSongById = async (req, res, next) => {
  try {
    const rawId = req.params.id;

    // 1. Kiểm tra tồn tại param
    if (!rawId) {
      throw new AppError("Thiếu ID bài hát.", 400, 'VALIDATION_ERROR');
    }

    // 2. Ép kiểu + validate
    const songId = parseInt(rawId, 10);

    if (!Number.isInteger(songId) || songId <= 0) {
      throw new AppError("ID bài hát không hợp lệ.", 400, 'VALIDATION_ERROR');
    }

    // 3. Gọi service
    const result = await songService.deleteSongById(songId);

    // New asset descriptors survive FK SET NULL and are drained by uploads:cleanup.
    // Do not guess provider identities from legacy URLs.
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const toggleSongVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.toggleSongVisibility(id);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const searchSongs = async (req, res, next) => {
  try {
    const { q = "", limit = 10 } = req.query;

    if (!q.trim()) {
      return res.json({ data: [] });
    }

    const songs = await songService.searchSongs(q, Number(limit));
    res.json({ data: songs });
  } catch (err) {
    next(err);
  }
};

/* --- DUYỆT BÀI HÁT (ADMIN) --- */
const getPendingSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await songService.getPendingSongs({ page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getPendingSongsCount = async (req, res, next) => {
  try {
    const count = await songService.getPendingSongsCount();
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

const approveSong = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.approveSong(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const rejectSong = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.rejectSong(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSong,
  userUploadSong,
  getAllSongs,
  getSongById,
  getSongPreview,
  updateSongById,
  deleteSongById,
  toggleSongVisibility,
  getSongList,
  increaseView,
  searchSongs,
  getPendingSongs,
  getPendingSongsCount,
  approveSong,
  rejectSong,
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.songs);
