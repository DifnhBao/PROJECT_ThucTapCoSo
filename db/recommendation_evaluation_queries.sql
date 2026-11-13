-- Recommendation evaluation queries for report/demo
-- Run after importing recommendation_demo_full_seed.sql and after calling POST /api/recommendations/rebuild-similarity.

-- 1) Dataset size summary
SELECT 'songs' AS metric, COUNT(*) AS value FROM songs WHERE song_id BETWEEN 1 AND 26
UNION ALL SELECT 'demo_users', COUNT(*) FROM users WHERE user_id BETWEEN 101 AND 115
UNION ALL SELECT 'demo_user_activities', COUNT(*) FROM UserActivities WHERE user_id BETWEEN 101 AND 115
UNION ALL SELECT 'demo_favorites', COUNT(*) FROM favorites WHERE user_id BETWEEN 101 AND 115
UNION ALL SELECT 'demo_ratings', COUNT(*) FROM ratings WHERE user_id BETWEEN 101 AND 115
UNION ALL SELECT 'similarity_rows', COUNT(*) FROM song_similarities;

-- 2) Evaluation group distribution
SELECT eval_group, group_label, COUNT(*) AS song_count
FROM eval_song_groups
GROUP BY eval_group, group_label
ORDER BY eval_group;

-- 3) User profile distribution
SELECT expected_group, COUNT(*) AS user_count
FROM eval_user_profiles
GROUP BY expected_group
ORDER BY expected_group;

-- 4) Normalized rating inspection: proves rating_score is interpreted relative to each user's own average
SELECT
  r.user_id,
  u.username,
  r.song_id,
  s.title,
  r.score,
  ROUND(avg_table.avg_score, 4) AS avg_rating_of_user,
  ROUND(r.score - avg_table.avg_score, 4) AS normalized_rating
FROM ratings r
JOIN users u ON r.user_id = u.user_id
JOIN songs s ON r.song_id = s.song_id
JOIN (
  SELECT user_id, AVG(score) AS avg_score
  FROM ratings
  WHERE user_id BETWEEN 101 AND 115
  GROUP BY user_id
) avg_table ON r.user_id = avg_table.user_id
WHERE r.user_id BETWEEN 101 AND 115
ORDER BY r.user_id, normalized_rating DESC, r.score DESC;

-- 5) Same-group vs different-group score separation
SELECT
  CASE WHEN g1.eval_group = g2.eval_group THEN 'same_group' ELSE 'different_group' END AS pair_type,
  COUNT(*) AS pair_count,
  ROUND(AVG(ss.metadata_score), 4) AS avg_metadata_score,
  ROUND(AVG(ss.behavioral_score), 4) AS avg_behavioral_score,
  ROUND(AVG(ss.final_score), 4) AS avg_final_score,
  ROUND(MIN(ss.final_score), 4) AS min_final_score,
  ROUND(MAX(ss.final_score), 4) AS max_final_score
FROM song_similarities ss
JOIN eval_song_groups g1 ON ss.song_id_1 = g1.song_id
JOIN eval_song_groups g2 ON ss.song_id_2 = g2.song_id
WHERE ss.song_id_1 < ss.song_id_2
GROUP BY pair_type;

-- 6) Similar Song Precision@5 by group
WITH ranked_similar AS (
  SELECT
    ss.song_id_1,
    ss.song_id_2,
    ss.final_score,
    ROW_NUMBER() OVER (PARTITION BY ss.song_id_1 ORDER BY ss.final_score DESC) AS rn
  FROM song_similarities ss
),
top_k AS (
  SELECT * FROM ranked_similar WHERE rn <= 5
)
SELECT
  g1.eval_group AS source_group,
  g1.group_label,
  COUNT(*) AS total_top5_items,
  SUM(CASE WHEN g1.eval_group = g2.eval_group THEN 1 ELSE 0 END) AS same_group_items,
  ROUND(SUM(CASE WHEN g1.eval_group = g2.eval_group THEN 1 ELSE 0 END) / COUNT(*), 4) AS precision_at_5
FROM top_k tk
JOIN eval_song_groups g1 ON tk.song_id_1 = g1.song_id
JOIN eval_song_groups g2 ON tk.song_id_2 = g2.song_id
GROUP BY g1.eval_group, g1.group_label
ORDER BY g1.eval_group;

-- 7) Overall Similar Song Precision@5
WITH ranked_similar AS (
  SELECT
    ss.song_id_1,
    ss.song_id_2,
    ss.final_score,
    ROW_NUMBER() OVER (PARTITION BY ss.song_id_1 ORDER BY ss.final_score DESC) AS rn
  FROM song_similarities ss
),
top_k AS (
  SELECT * FROM ranked_similar WHERE rn <= 5
)
SELECT
  COUNT(*) AS total_top5_items,
  SUM(CASE WHEN g1.eval_group = g2.eval_group THEN 1 ELSE 0 END) AS same_group_items,
  ROUND(SUM(CASE WHEN g1.eval_group = g2.eval_group THEN 1 ELSE 0 END) / COUNT(*), 4) AS overall_precision_at_5
FROM top_k tk
JOIN eval_song_groups g1 ON tk.song_id_1 = g1.song_id
JOIN eval_song_groups g2 ON tk.song_id_2 = g2.song_id;

-- 8) Trending list for cold-start validation. API GET /api/recommendations/users/115?limit=10 should match this order.
SELECT song_id, title, view_count
FROM songs
WHERE is_visible = 1 AND status = 'approved'
ORDER BY view_count DESC
LIMIT 10;
