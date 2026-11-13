const config = require('./config');

function qualified(activity) {
  // T11 receipts are authoritative. Legacy sessions cannot prove qualification.
  return Number(activity.event_version) === 1 && Boolean(activity.qualified)
    && Number(activity.song_duration) >= 20 && Number(activity.total_listened_time) >= 20;
}

function userSignals(activities, favorites, ratings) {
  const weights = new Map(), counts = new Map(), rejected = new Set();
  const add = (id, value) => weights.set(Number(id), (weights.get(Number(id)) || 0) + value);
  for (const row of activities) {
    if (!qualified(row)) continue;
    const id = Number(row.song_id), count = counts.get(id) || 0;
    if (count < config.repeatCap) add(id, config.listenWeight);
    counts.set(id, count + 1);
  }
  for (const row of favorites) add(row.song_id, config.favoriteWeight);
  for (const row of ratings) {
    if (Number(row.score) <= config.lowRating) rejected.add(Number(row.song_id));
    else if (Number(row.score) >= config.highRating) add(row.song_id, config.highRatingWeight);
  }
  for (const id of rejected) weights.delete(id);
  return { weights, rejected };
}

function interactionMatrix(activities, favorites, ratings) {
  const users = new Map(), matrix = new Map();
  for (const [kind, rows] of [['activities', activities], ['favorites', favorites], ['ratings', ratings]]) {
    for (const row of rows) {
      if (!users.has(row.user_id)) users.set(row.user_id, { activities: [], favorites: [], ratings: [] });
      users.get(row.user_id)[kind].push(row);
    }
  }
  for (const [userId, rows] of users) {
    for (const [songId, weight] of userSignals(rows.activities, rows.favorites, rows.ratings).weights) {
      if (!matrix.has(songId)) matrix.set(songId, new Map());
      matrix.get(songId).set(userId, weight);
    }
  }
  return matrix;
}
module.exports = { qualified, userSignals, interactionMatrix };
