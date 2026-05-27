const UserActivity = require("../models/mongo/UserActivity");

/**
 * Service lưu hoặc cập nhật hoạt động nghe nhạc của user
 */
const upsertUserActivity = async (activityData) => {
  const {
    session_id,
    user_id,
    song_id,
    total_listened_time,
    song_duration,
    max_position_reached,
    play_pause_count,
    seek_count,
    exit_reason,
    source,
  } = activityData;

  return await UserActivity.findOneAndUpdate(
    { session_id: session_id },
    {
      user_id,
      song_id,
      total_listened_time,
      song_duration,
      max_position_reached,
      play_pause_count,
      seek_count,
      exit_reason,
      source,
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );
};

module.exports = {
  upsertUserActivity,
};
