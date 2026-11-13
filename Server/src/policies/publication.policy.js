const { Song } = require("../models");
const { AuthorizationError, requireId } = require("../utils/authorization");

// The mandatory constraints are applied last so callers cannot relax them.
function publicSongWhere(extra = {}) {
  return { ...extra, status: "approved", is_visible: true };
}

async function requirePublicSong(songId, options = {}) {
  const song = await Song.findOne({
    ...options,
    where: publicSongWhere({ ...options.where, song_id: requireId(songId) }),
  });
  if (!song) throw new AuthorizationError("Không tìm thấy bài hát.", 404, "SONG_NOT_FOUND");
  return song;
}

function publicRecommendationItem(item) {
  const fields = ["song", "final_score", "metadata_score", "behavioral_score", "reason",
    "accumulated_score", "endorsed_by_count", "is_discovery_candidate"];
  return Object.fromEntries(fields.filter((key) => item[key] !== undefined).map((key) => [key, item[key]]));
}

module.exports = { publicSongWhere, requirePublicSong, publicRecommendationItem };
