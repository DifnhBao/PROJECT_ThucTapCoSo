const { saveRandomJamendoTracksToDB } = require("../services/jamendo.service");

/**
 * GET /api/jamendo/random
 */
async function fetchRandomJamendoTracks(req, res) {
  try {
    const result = await saveRandomJamendoTracksToDB();

    return res.status(200).json({
      success: true,
      message: "Fetched 200 random Jamendo tracks",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  fetchRandomJamendoTracks,
};
