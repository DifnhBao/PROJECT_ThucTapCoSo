const playlistService = require("../services/playlist.service");

const createPlaylist = async (req, res, next) => {
  try {
    const userId = req.user.user_id; // Lay ID nguoi dung tu token
    const playlistData = req.body;

    const newPlaylist = await playlistService.createPlaylist(
      userId,
      playlistData
    );
    res.status(201).json({
      message: "Tạo playlist thành công.",
      data: newPlaylist,
    });
  } catch (error) {
    next(error);
  }
};

const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const playlists = await playlistService.getMyPlaylists(userId);

    res.status(200).json({ data: playlists });
  } catch (error) {
    next(error);
  }
};

const addSongToPlaylist = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params; // ID Playlist
    const { songId } = req.body; // ID bai hat muon them

    const result = await playlistService.addSongToPlaylist(userId, id, songId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id, songId } = req.params;

    const result = await playlistService.removeSongFromPlaylist(
      userId,
      id,
      songId
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const deletePlaylist = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const result = await playlistService.deletePlaylist(userId, id);
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
};
