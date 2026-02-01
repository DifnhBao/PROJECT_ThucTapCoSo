// const { Playlist, Song, PlaylistSongs, sequelize } = require("../models");
// const { literal } = require("sequelize");

// const DAILY_MIX_COUNT = 8;
// const DAILY_MIX_SIZE = 20;

// function getToday() {
//   return new Date().toISOString().slice(0, 10);
// }

// /**
//  * Kiểm tra & tạo daily mix cho hôm nay
//  */
// async function ensureDailyMixes() {
//   const today = getToday();

//   const existingCount = await Playlist.count({
//     where: {
//       type: "DAILY_MIX",
//       mix_date: today,
//     },
//   });

//   if (existingCount >= DAILY_MIX_COUNT) {
//     return;
//   }

//   // Xoá daily mix cũ (nếu còn sót)
//   const oldMixes = await Playlist.findAll({
//     where: {
//       type: "DAILY_MIX",
//       mix_date: today,
//     },
//   });

//   const oldIds = oldMixes.map(p => p.playlist_id);

//   if (oldIds.length) {
//     await PlaylistSongs.destroy({
//       where: { playlist_id: oldIds },
//     });
//     await Playlist.destroy({
//       where: { playlist_id: oldIds },
//     });
//   }

//   // Tạo mới 8 playlist
//   for (let i = 1; i <= DAILY_MIX_COUNT; i++) {
//     const playlist = await Playlist.create({
//       name: `Daily Mix ${i}`,
//       type: "DAILY_MIX",
//       mix_date: today,
//     });

//     // Lấy 20 bài random
//     const songs = await Song.findAll({
//       where: { is_visible: true },
//       order: literal("RAND()"),
//       limit: DAILY_MIX_SIZE,
//     });

//     const bulk = songs.map(song => ({
//       playlist_id: playlist.playlist_id,
//       song_id: song.song_id,
//     }));

//     await PlaylistSongs.bulkCreate(bulk);
//   }
// }

// module.exports = {
//   ensureDailyMixes,
// };
