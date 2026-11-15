/*
node scripts/syncJamendo.js
node scripts/migrateArtists.js
node scripts/createDailyMix.js
*/

require("dotenv").config();
const { Playlist, Song, PlaylistSongs, sequelize } = require("../src/models");
const { literal } = require("sequelize");

const DAILY_MIX_COUNT = 8;
const DAILY_MIX_SIZE = 20;

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

async function generateDailyMixes() {
  const today = getToday();

  const existingCount = await Playlist.count({
    where: {
      type: "DAILY_MIX",
      mix_date: today,
    },
  });

  if (existingCount >= DAILY_MIX_COUNT) {
    console.log("Daily mixes already exist, skip");
    return;
  }

  // Xoá daily mix cũ (nếu còn sót)
  const oldMixes = await Playlist.findAll({
    where: {
      type: "DAILY_MIX",
      mix_date: today,
    },
  });

  const oldIds = oldMixes.map((p) => p.playlist_id);

  if (oldIds.length) {
    await PlaylistSongs.destroy({
      where: { playlist_id: oldIds },
    });
    await Playlist.destroy({
      where: { playlist_id: oldIds },
    });
  }

  // Tạo mới playlist
  for (let i = 1; i <= DAILY_MIX_COUNT; i++) {
    const playlist = await Playlist.create({
      name: `Daily Mix ${i}`,
      type: "DAILY_MIX",
      mix_date: today,
    });

    const songs = await Song.findAll({
      where: { is_visible: true },
      order: literal("RAND()"),
      limit: DAILY_MIX_SIZE,
    });

    const bulk = songs.map((song) => ({
      playlist_id: playlist.playlist_id,
      song_id: song.song_id,
    }));

    await PlaylistSongs.bulkCreate(bulk);
  }

  console.log("Daily mixes generated successfully");
}

(async () => {
  try {
    await sequelize.authenticate();
    await generateDailyMixes();
    process.exit(0);
  } catch (err) {
    console.error("Generate daily mix failed:", err);
    process.exit(1);
  }
})();
