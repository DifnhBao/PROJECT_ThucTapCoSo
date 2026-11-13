const playlistService = require("../services/playlist.service");

const createPlaylist = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { name, description } = req.body;

    const newPlaylist = await playlistService.createPlaylist(
      userId,
      name,
      description,
    );
    res.status(201).json({
      success: true,
      data: newPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

const addSongToPlaylist = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { playlistId } = req.params; // ID Playlist
    const { songId } = req.body; // ID bai hat muon them

    const result = await playlistService.addSongToPlaylist(
      userId,
      playlistId,
      songId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const playlists = await playlistService.getMyPlaylists(userId);

    res.status(200).json({ data: playlists });
  } catch (error) {
    next(error);
  }
};

const getPlaylistDetail = async (req, res, next) => {
  try {
    const { playlistId } = req.params;

    const playlist = await playlistService.getPlaylistDetail(playlistId, req.auth);

    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.auth.userId;

    await playlistService.removeSongFromPlaylist(userId, playlistId, songId);
    res.status(200).json({
      success: true,
      message: "Xóa bài hát khỏi danh sách phát thành công",
    });
  } catch (error) {
    next(error);
  }
};

// ================================

const deletePlaylist = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { playlistId } = req.params;

    const result = await playlistService.deletePlaylist(userId, playlistId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

async function getDailyMix(req, res, next) {
  try {
    const mix = await playlistService.getTodayDailyMix();
    res.status(200).json(mix);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPlaylist,
  getMyPlaylists,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
  getDailyMix,
  getPlaylistDetail,
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.playlists);
