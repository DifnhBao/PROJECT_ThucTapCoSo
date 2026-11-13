// node scripts/syncJamendoTracks.js

const Song = require("../models/song.model");

const JAMENDO_CLIENT_ID = "0ffcdfae";
const JAMENDO_API = "https://api.jamendo.com/v3.0/tracks";

/**
 * Lấy 200 bài ngẫu nhiên bằng offset
 */
async function fetchRandomJamendoTracks() {
  // offset ngẫu nhiên (0 → 200000 là an toàn)
  const randomOffset = Math.floor(Math.random() * 2000);

  const url =
    `${JAMENDO_API}?client_id=${JAMENDO_CLIENT_ID}` +
    `&format=json` +
    `&limit=200` +
    `&offset=${randomOffset}` +
    `&include=musicinfo` +
    `&audioformat=mp31`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Jamendo API error: ${response.status}`);
  }

  const data = await response.json();

  // DEBUG nếu cần
  // console.log("Jamendo raw:", data);

  return data.results || [];
}

/**
 * Lưu vào DB
 */
async function saveRandomJamendoTracksToDB() {
  const tracks = await fetchRandomJamendoTracks();

  let inserted = 0;

  for (const track of tracks) {
    const genre = track.musicinfo?.tags?.genres?.[0] || "Other";

    const [, created] = await Song.findOrCreate({
      where: { jamendo_id: track.id },
      defaults: {
        jamendo_id: track.id,
        title: track.name,
        duration: track.duration,
        audio_url: track.audio,
        image_url: track.image || null,
        artist_name: track.artist_name || null,
        album_name: track.album_name || null,
        genre,
        fetched_at: new Date(),
      },
    });

    if (created) inserted++;
  }

  return {
    totalFetched: tracks.length,
    totalInserted: inserted,
  };
}

module.exports = {
  saveRandomJamendoTracksToDB,
};
