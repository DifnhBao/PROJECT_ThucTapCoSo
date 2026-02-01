/*
node scripts/syncJamendoTracks.js
node scripts/migrateArtists.js
node scripts/createDailyMix.js
*/

const sequelize = require("../src/config/db");
const {
  saveRandomJamendoTracksToDB,
} = require("../src/services/jamendo.service");

async function syncJamendo() {
  try {
    console.log("Starting Jamendo sync...");

    const result = await saveRandomJamendoTracksToDB();

    console.log("Jamendo sync completed:", result);
  } catch (error) {
    console.error("Jamendo sync failed:", error);
  } finally {
    await sequelize.close();
  }
}

syncJamendo();
