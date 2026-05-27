const playlistService = require("../services/playlist.service");

const createPlaylist = async (req, res, next) => {
  try {
    const userId = req.user.userId;
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const addSongToPlaylist = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { playlistId } = req.params; // ID Playlist
    const { songId } = req.body; // ID bai hat muon them

    const result = await playlistService.addSongToPlaylist(
      userId,
      playlistId,
      songId,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const playlists = await playlistService.getMyPlaylists(userId);

    res.status(200).json({ data: playlists });
  } catch (error) {
    next(error);
  }
};

const getPlaylistDetail = async (req, res, next) => {
  try {
    const { playlistId } = req.params;

    const playlist = await playlistService.getPlaylistDetail(playlistId);

    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.userId;

    await playlistService.removeSongFromPlaylist(userId, playlistId, songId);
    res.status(200).json({
      success: true,
      message: "Xóa bài hát khỏi danh sách phát thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================

const deletePlaylist = async (req, res, next) => {
  try {
    const userId = req.user.userId;
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
