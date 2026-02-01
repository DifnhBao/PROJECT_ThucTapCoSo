const { Playlist, Song, PlaylistSongs } = require("../models");
const { ensureDailyMixes } = require("../services/dailyMix.service");

async function getDailyMixList(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const playlists = await Playlist.findAll({
      where: {
        type: "DAILY_MIX",
        // mix_date: today,
      },
      attributes: ["playlist_id", "name"],
      include: [
        {
          model: Song,
          attributes: ["song_id", "image_url"],
          through: { attributes: [] },
        },
      ],
      order: [["playlist_id", "ASC"]],
    });

    // Chỉ lấy 4 bài đầu làm cover
    const result = playlists.map((pl) => ({
      playlist_id: pl.playlist_id,
      name: pl.name,
      tracks: pl.Songs.slice(0, 4).map((s) => ({
        song_id: s.song_id,
        image_url: s.image_url,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getDailyMixDetail(req, res) {
  try {
    const { playlistId } = req.params;

    const playlist = await Playlist.findOne({
      where: {
        playlist_id: playlistId,
        type: "DAILY_MIX",
      },
      include: [
        {
          model: Song,
          through: { attributes: [] },
        },
      ],
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "Daily mix not found",
      });
    }

    return res.json({
      success: true,
      data: playlist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDailyMixList,
  getDailyMixDetail,
};
