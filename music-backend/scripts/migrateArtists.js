/*
node scripts/syncJamendo.js
node scripts/migrateArtists.js
node scripts/createDailyMix.js
*/

const sequelize = require("../src/config/db");
const Song = require("../src/models/song.model");
const Artist = require("../src/models/artist.model");

async function migrateArtistsFromSongs() {
  const transaction = await sequelize.transaction();

  try {
    console.log("Starting artist migration...");

    // 1. Lấy danh sách artist_name khác null
    const songs = await Song.findAll({
      where: {
        artist_name: {
          [sequelize.Sequelize.Op.ne]: null,
        },
      },
      attributes: ["song_id", "artist_name"],
      transaction,
    });

    // 2. Gom artist_name duy nhất
    const uniqueArtists = [...new Set(songs.map((s) => s.artist_name.trim()))];

    console.log(`Found ${uniqueArtists.length} artists`);

    // 3. Tạo artist nếu chưa tồn tại
    for (const name of uniqueArtists) {
      await Artist.findOrCreate({
        where: { name },
        defaults: {
          jamendo_id: `legacy_${name}`, // tạm thời
          image_url: null,
        },
        transaction,
      });
    }

    // 4. Map artist_name → artist_id
    const artists = await Artist.findAll({
      attributes: ["artist_id", "name"],
      transaction,
    });

    const artistMap = {};
    for (const artist of artists) {
      artistMap[artist.name] = artist.artist_id;
    }

    // 5. Update song.artist_id
    for (const song of songs) {
      const artistId = artistMap[song.artist_name.trim()];
      if (artistId) {
        await Song.update(
          { artist_id: artistId },
          {
            where: { song_id: song.song_id },
            transaction,
          }
        );
      }
    }

    await transaction.commit();
    console.log("Artist migration completed successfully.");
  } catch (error) {
    await transaction.rollback();
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

migrateArtistsFromSongs();
