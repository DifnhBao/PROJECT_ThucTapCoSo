const { Op } = require("sequelize");
const {
  SongSimilarity,
  Song,
  Artist,
  Genre,
  Favorite,
  UserActivity,
  Rating,
} = require("../../models");
const {
  getSongMetadata,
  calculateMetadataSimilarity,
} = require("./metadataSimilarity.service");
const {
  buildUserSongInteractionMatrix,
} = require("./interactionScoring.service");
const {
  calculateBehavioralSimilarity,
} = require("./behavioralSimilarity.service");
const { buildReason } = require("./hybridSimilarity.service");
const { buildLyricsTfIdfVectorMap } = require("./lyricsSimilarity.service");

const DEBUG_RECOMMENDATION =
  process.env.DEBUG_RECOMMENDATION === "true" ||
  process.env.RECOMMENDATION_DEBUG === "true";

const SONG_INCLUDE = [
  {
    model: Artist,
    as: "artists",
    attributes: ["artist_id", "name"],
    through: { attributes: [] },
  },
  {
    model: Genre,
    as: "genres",
    attributes: ["genre_id", "name"],
    through: { attributes: [] },
  },
];

const SONG_ATTRIBUTES = [
  "song_id",
  "title",
  "duration",
  "audio_url",
  "image_url",
  "view_count",
];

function logRecommendationDebug(stage, payload) {
  if (!DEBUG_RECOMMENDATION) return;
  console.log(`[Recommendation][getRecommendationsForUser][${stage}]`, payload);
}

/*
normalized_score > 0:
user đánh giá bài này cao hơn mức trung bình của chính họ.

weight:
normalized càng cao thì rating seed càng mạnh.

fallback:
nếu user chỉ có 1 rating hoặc toàn rating cao bằng nhau, vẫn giữ rating >= 4 để không làm mất tín hiệu rõ ràng.
*/

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildNormalizedRatingSeedItems(userRatings, limit = 5) {
  const validRatings = userRatings
    .map((rating) => ({
      song_id: rating.song_id,
      score: Number(rating.score),
    }))
    .filter(
      (rating) =>
        Number.isInteger(Number(rating.song_id)) &&
        Number.isFinite(rating.score),
    );

  if (validRatings.length === 0) {
    return {
      avgRating: null,
      ratingSeedItems: [],
    };
  }

  const avgRating =
    validRatings.reduce((sum, rating) => sum + rating.score, 0) /
    validRatings.length;

  let candidates = validRatings
    .map((rating) => ({
      ...rating,
      normalized_score: rating.score - avgRating,
      seed_reason: "normalized_rating_positive",
    }))
    .filter((rating) => rating.normalized_score > 0);

  /*
    Trường hợp fallback:
    - User chỉ có 1 rating thì normalized_score = 0, không đủ để so bias.
    - User rating toàn 5 sao thì tất cả normalized_score = 0.
    Khi đó vẫn giữ lại rating >= 4 như explicit positive feedback.
  */
  if (candidates.length === 0) {
    candidates = validRatings
      .filter((rating) => rating.score >= 4)
      .map((rating) => ({
        ...rating,
        normalized_score: 0,
        seed_reason: "fallback_explicit_high_rating",
      }));
  }

  const ratingSeedItems = candidates
    .sort((a, b) => {
      if (b.normalized_score !== a.normalized_score) {
        return b.normalized_score - a.normalized_score;
      }
      return b.score - a.score;
    })
    .slice(0, limit)
    .map((rating) => ({
      song_id: rating.song_id,
      score: rating.score,
      avg_rating: Math.round(avgRating * 10000) / 10000,
      normalized_score: Math.round(rating.normalized_score * 10000) / 10000,
      weight:
        rating.seed_reason === "fallback_explicit_high_rating"
          ? 1.2
          : Math.round(
              clampNumber(1.2 + rating.normalized_score * 0.2, 1.1, 1.6) *
                10000,
            ) / 10000,
      seed_reason: rating.seed_reason,
    }));

  return {
    avgRating: Math.round(avgRating * 10000) / 10000,
    ratingSeedItems,
  };
}

/* =========================================================
   1. getSimilarSongs — Bài hát tương tự
   ========================================================= */

/**
 * Lấy danh sách bài hát tương tự nhất với bài cho trước,
 * đọc từ bảng song_similarities đã được pre-compute.
 *
 * Vì engine lưu cả 2 chiều (A→B và B→A), ta chỉ cần
 * query đơn giản WHERE song_id_1 = songId.
 *
 * @param {number} songId
 * @param {number} [limit=10]
 * @returns {Promise<Object[]>}
 */
async function getSimilarSongs(songId, limit = 10) {
  const rows = await SongSimilarity.findAll({
    where: { song_id_1: songId },
    order: [["final_score", "DESC"]],
    limit,
    include: [
      {
        model: Song,
        as: "song2", // Bài tương tự (phía B)
        where: { is_visible: true, status: "approved" },
        attributes: [
          "song_id",
          "title",
          "duration",
          "audio_url",
          "image_url",
          "view_count",
        ],
        include: SONG_INCLUDE,
      },
    ],
  });

  if (rows.length > 0) {
    return rows.map((row) => ({
      // Thông tin bài hát tương tự
      song: row.song2,
      // Điểm & lý do
      final_score: row.final_score,
      metadata_score: row.metadata_score,
      behavioral_score: row.behavioral_score,
      reason: row.reason,
      detail: row.detail,
    }));
  }

  return getRealtimeMetadataSimilarSongs(songId, limit);
}

/**
 * Fallback realtime khi bảng song_similarities chưa có dữ liệu cho bài hiện tại.
 * Dùng lại metadata similarity hiện có để demo không bị trả rỗng sau khi thêm bài mới.
 *
 * @param {number} songId
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function getRealtimeMetadataSimilarSongs(songId, limit) {
  const [currentMeta, songs] = await Promise.all([
    getSongMetadata(songId),
    Song.findAll({
      where: {
        song_id: { [Op.ne]: songId },
        is_visible: true,
        status: "approved",
      },
      attributes: [
        "song_id",
        "title",
        "duration",
        "audio_url",
        "image_url",
        "view_count",
      ],
      include: SONG_INCLUDE,
    }),
  ]);

  const metadataList = await Promise.all(
    songs.map((song) => getSongMetadata(song.song_id)),
  );

  const allMeta = [currentMeta, ...metadataList];
  const vectorMap = buildLyricsTfIdfVectorMap(allMeta);

  for (const meta of allMeta) {
    meta.lyricsVector = vectorMap.get(meta.song_id) || new Map();
  }
  const songMap = new Map(songs.map((song) => [song.song_id, song]));
  const fallbackReason =
    "Gợi ý dựa trên metadata vì bài hát chưa có dữ liệu hành vi/precomputed similarity.";

  return metadataList
    .map((meta) => {
      const { score, detail } = calculateMetadataSimilarity(currentMeta, meta);

      return {
        song: songMap.get(meta.song_id),
        final_score: score,
        metadata_score: score,
        behavioral_score: 0,
        reason: fallbackReason,
        detail: {
          metadata_detail: detail,
          behavioral_detail: {
            raw_cosine_score: 0,
            confidence: 0,
            adjusted_behavioral_score: 0,
            common_user_count: 0,
            reason_code: "metadata_realtime_fallback",
          },
          source: "realtime_metadata_fallback",
        },
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit);
}

/* =========================================================
   1b. fallbackRecommendationsBySeedMetadata — fallback cá nhân hóa
   ========================================================= */

/**
 * Fallback cá nhân hóa khi user có seed songs nhưng các seed đó chưa có
 * dữ liệu trong bảng song_similarities.
 *
 * Khác với trending fallback, hàm này vẫn tận dụng sở thích user:
 * - lấy các bài user đã nghe/yêu thích/rating cao làm seed
 * - so sánh metadata của seed với các bài còn lại
 * - cộng điểm theo weight của từng seed
 *
 * @param {Map<number, number>} seedWithWeight song_id -> seed weight
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function fallbackRecommendationsBySeedMetadata(
  seedWithWeight,
  limit = 10,
) {
  const seedIds = [...seedWithWeight.keys()];
  const seedSongIds = new Set(seedIds);

  if (seedIds.length === 0) {
    return getTrendingSongs(limit);
  }

  const seedMetadataList = (
    await Promise.all(
      seedIds.map(async (seedId) => {
        try {
          const meta = await getSongMetadata(seedId);
          return { meta, weight: seedWithWeight.get(seedId) || 1 };
        } catch (error) {
          console.warn(
            `[Recommendation] Skip seed metadata fallback for song_id=${seedId}: ${error.message}`,
          );
          return null;
        }
      }),
    )
  ).filter(Boolean);

  if (seedMetadataList.length === 0) {
    return getTrendingSongs(limit);
  }

  const candidateSongs = await Song.findAll({
    where: {
      song_id: { [Op.notIn]: seedIds },
      is_visible: true,
      status: "approved",
    },
    attributes: SONG_ATTRIBUTES,
    include: SONG_INCLUDE,
  });

  if (candidateSongs.length === 0) {
    return getTrendingSongs(limit);
  }

  const candidateMetadataList = (
    await Promise.all(
      candidateSongs.map(async (song) => {
        try {
          const meta = await getSongMetadata(song.song_id);
          return meta;
        } catch (error) {
          console.warn(
            `[Recommendation] Skip candidate metadata fallback for song_id=${song.song_id}: ${error.message}`,
          );
          return null;
        }
      }),
    )
  ).filter(Boolean);

  const allMeta = [
    ...seedMetadataList.map((item) => item.meta),
    ...candidateMetadataList,
  ];

  const vectorMap = buildLyricsTfIdfVectorMap(allMeta);

  for (const meta of allMeta) {
    meta.lyricsVector = vectorMap.get(meta.song_id) || new Map();
  }

  const candidateSongMap = new Map(
    candidateSongs.map((song) => [song.song_id, song]),
  );
  const candidateMap = new Map();

  for (const { meta: seedMeta, weight } of seedMetadataList) {
    for (const candidateMeta of candidateMetadataList) {
      if (seedSongIds.has(candidateMeta.song_id)) continue;

      const { score, detail } = calculateMetadataSimilarity(
        seedMeta,
        candidateMeta,
      );
      if (score <= 0) continue;

      if (!candidateMap.has(candidateMeta.song_id)) {
        candidateMap.set(candidateMeta.song_id, {
          accumulated_score: 0,
          endorsed_by_count: 0,
          best_detail: detail,
          best_score: score,
          best_seed_title: seedMeta.title,
        });
      }

      const entry = candidateMap.get(candidateMeta.song_id);
      entry.accumulated_score += score * weight;
      entry.endorsed_by_count += 1;

      if (score > entry.best_score) {
        entry.best_score = score;
        entry.best_detail = detail;
        entry.best_seed_title = seedMeta.title;
      }

      // const commonGenres = detail?.common_genres || [];
      // const commonMoods = detail?.common_moods || [];
      // const commonArtists = detail?.common_artists || [];

      // if (commonGenres.length > 0) {
      //   entry.common_reasons.push(
      //     `cùng thể loại ${commonGenres.slice(0, 2).join(", ")}`,
      //   );
      // }
      // if (commonMoods.length > 0) {
      //   entry.common_reasons.push(
      //     `cùng mood ${commonMoods.slice(0, 2).join(", ")}`,
      //   );
      // }
      // if (commonArtists.length > 0) {
      //   entry.common_reasons.push(
      //     `cùng nghệ sĩ ${commonArtists.slice(0, 2).join(", ")}`,
      //   );
      // }
    }
  }

  const ranked = [...candidateMap.entries()]
    .sort(([, a], [, b]) => b.accumulated_score - a.accumulated_score)
    .slice(0, limit);

  const recommendations = ranked
    .filter(([songId]) => candidateSongMap.has(songId))
    .map(([songId, data]) => {
      return {
        song: candidateSongMap.get(songId),
        accumulated_score: Math.round(data.accumulated_score * 10000) / 10000,

        // Gọi hàm dịch thuật dùng chung cho toàn hệ thống
        reason: buildUserCentricReason(
          data.best_seed_title || "những ca khúc yêu thích",
          "recent_activity", // Fallback mặc định là recent_activity
          { metadata_detail: data.best_detail }, // Đóng gói lại thành cấu trúc detail
        ),

        endorsed_by_count: data.endorsed_by_count,
        is_discovery_candidate: true,
        fallback_source: "seed_metadata",
        detail: {
          metadata_detail: data.best_detail,
          source: "seed_metadata_fallback",
        },
      };
    });

  if (recommendations.length === 0) {
    return getTrendingSongs(limit);
  }

  return recommendations;
}

/* =========================================================
   2. getRecommendationsForUser — Gợi ý cá nhân hoá
   ========================================================= */

/**
 * Gợi ý bài hát cá nhân hoá cho người dùng theo thuật toán:
 *
 *   Bước 1 — Tìm "seed songs" (bài gốc của user):
 *     - Top 10 bài nghe gần đây (UserActivity)
 *     - Top 5 bài yêu thích (Favorite)
 *     - Top 5 bài có normalized rating dương
 *       normalized_rating = rating_score - avg_rating_of_user
 *
 *   Bước 2 — Expand từ seed:
 *     Với mỗi seed, lấy top 20 bài tương tự từ SongSimilarity.
 *
 *   Bước 3 — Gộp điểm (Score Aggregation):
 *     Nếu nhiều seed cùng gợi ý một bài → điểm cộng dồn.
 *     accumulated_score += final_score * weight_of_seed
 *
 *   Bước 4 — Lọc bài đã nghe / đã thích:
 *     Loại bỏ bài trong "heard_song_ids" (đã nghe > 2 lần).
 *
 *   Bước 5 — Trả top `limit` bài có điểm cao nhất.
 *
 * @param {number} userId
 * @param {number} [limit=10]
 * @returns {Promise<Object[]>}
 */
async function getRecommendationsForUser(userId, limit = 10) {
  /* BƯỚC 1: Lấy seed songs  */

  // Bài nghe gần đây
  const recentActivities = await UserActivity.findAll({
    where: { user_id: userId },
    attributes: ["song_id"],
    order: [["created_at", "DESC"]],
    limit: 30, // Lấy rộng để deduplicate
  });

  // Đếm số lần nghe để biết bài nào "đã nghe nhiều"
  const listenCountMap = new Map();
  for (const act of recentActivities) {
    listenCountMap.set(act.song_id, (listenCountMap.get(act.song_id) || 0) + 1);
  }

  // Bài đã nghe > 2 lần → coi là "đã biết", loại ra khỏi kết quả
  const heardTooMuch = new Set(
    [...listenCountMap.entries()]
      .filter(([, count]) => count > 2)
      .map(([song_id]) => song_id),
  );

  // Seed 1: Top 10 bài nghe gần nhất (deduplicated, giữ thứ tự)
  const recentSeedIds = [
    ...new Set(recentActivities.map((a) => a.song_id)),
  ].slice(0, 10);

  // Seed 2: Bài yêu thích
  const favorites = await Favorite.findAll({
    where: { user_id: userId },
    attributes: ["song_id"],
    order: [["created_at", "DESC"]],
    limit: 5,
  });
  const favoriteSeedIds = favorites.map((f) => f.song_id);

  // Seed 3: Bài được user đánh giá cao hơn mức trung bình của chính user đó
  const userRatings = await Rating.findAll({
    where: { user_id: userId },
    attributes: ["song_id", "score"],
  });

  const { avgRating, ratingSeedItems } = buildNormalizedRatingSeedItems(
    userRatings,
    5,
  );

  const ratingSeedIds = ratingSeedItems.map((item) => item.song_id);

  // Gộp seed, tránh trùng lặp; gán trọng số theo nguồn
  // Favorite > Recent > Rating (favorite là tín hiệu rõ nhất)
  const seedWithWeight = [
    ...favoriteSeedIds.map((id) => ({
      song_id: id,
      weight: 1.5,
      source: "favorite",
    })),
    ...recentSeedIds.map((id) => ({
      song_id: id,
      weight: 1.0,
      source: "recent_activity",
    })),
    ...ratingSeedItems.map((item) => ({
      song_id: item.song_id,
      weight: item.weight,
      source: "normalized_rating",
      normalized_score: item.normalized_score,
      avg_rating: item.avg_rating,
    })),
  ].reduce((acc, { song_id, weight }) => {
    if (!acc.has(song_id) || acc.get(song_id) < weight) {
      acc.set(song_id, weight);
    }
    return acc;
  }, new Map());

  if (seedWithWeight.size === 0) {
    logRecommendationDebug("fallback:no-seeds", {
      userId,
      "recentActivities.length": recentActivities.length,
      favoriteSeedIds,
      ratingSeedIds,
      avgRating,
      ratingSeedItems,
      "seedWithWeight.size": seedWithWeight.size,
      "candidateMap.size": 0,
      "topCandidates.length": 0,
      candidateSongIds: [],
      "songs.length": 0,
      "recommendations.length": 0,
    });
    // Cold start: user chưa có lịch sử → trả về top trending
    return getTrendingSongs(limit);
  }

  // Tập bài user đã nghe bất kỳ lần nào → dùng để ưu tiên lọc
  const allHeardSongIds = new Set(recentActivities.map((a) => a.song_id));
  const favoriteSongIds = new Set(favoriteSeedIds);
  const seedSongIds = new Set(seedWithWeight.keys());

  /* BƯỚC 2 & 3: Expand seed và gộp điểm */
  const candidateMap = new Map();

  const seedSongsInfo = await Song.findAll({
    where: { song_id: { [Op.in]: Array.from(seedSongIds) } },
    attributes: ["song_id", "title"],
  });
  const seedTitleMap = new Map(seedSongsInfo.map((s) => [s.song_id, s.title]));

  for (const [seedId, weight] of seedWithWeight.entries()) {
    const similars = await SongSimilarity.findAll({
      where: { song_id_1: seedId },
      order: [["final_score", "DESC"]],
      limit: 20, // Top 20 gợi ý mỗi seed
      attributes: ["song_id_2", "final_score", "detail"],
    });

    // Tìm nguồn của seed này từ map ban đầu để biết user đã thích/nghe/hay rating
    const seedTitle = seedTitleMap.get(seedId) || "ca khúc bạn từng nghe";

    for (const sim of similars) {
      const candId = sim.song_id_2;

      // Không gợi ý lại bất kỳ seed song nào cho chính user đó
      if (seedSongIds.has(candId)) continue;

      // Bỏ qua bài đã nghe quá nhiều và đã favorite
      // (user đã biết bài này rồi, không cần gợi ý)
      if (heardTooMuch.has(candId) && favoriteSongIds.has(candId)) continue;

      const weightedScore = sim.final_score * weight;
      const isDiscoveryCandidate =
        !allHeardSongIds.has(candId) && !favoriteSongIds.has(candId);

      if (!candidateMap.has(candId)) {
        candidateMap.set(candId, {
          accumulated_score: 0,
          // reasons: [],
          // best_reason: null,
          // best_weighted_score: -Infinity,
          is_discovery_candidate: isDiscoveryCandidate,
          // Lưu lại thông tin của seed mạnh nhất sinh ra bài này
          best_seed_id: seedId,
          best_seed_title: seedTitle,
          best_score: sim.final_score,
          // Giữ lại meta detail để tạo câu reason cá nhân hóa real-time
          best_detail: sim.detail,
          endorsed_by_count: 0,
        });
      }

      const entry = candidateMap.get(candId);

      entry.accumulated_score += weightedScore;
      entry.is_discovery_candidate =
        entry.is_discovery_candidate || isDiscoveryCandidate;

      // Mỗi lần một seed gợi ý bài này, tăng biến đếm lên 1
      entry.endorsed_by_count += 1;

      // Cập nhật nếu tìm thấy seed có sức ảnh hưởng mạnh hơn (Đóng góp nhiều điểm hơn)
      if (weightedScore > entry.accumulated_score - weightedScore) {
        entry.best_seed_id = seedId;
        entry.best_seed_title = seedTitle;
        entry.best_detail = sim.detail; // Cập nhật lại detail của seed mạnh nhất
      }

      // if (sim.reason) {
      //   entry.reasons.push(sim.reason);

      //   // Chọn reason đến từ seed đóng góp điểm mạnh nhất cho candidate này.
      //   // weightedScore đã bao gồm cả final_score của cặp bài hát và weight của seed.
      //   if (weightedScore > entry.best_weighted_score) {
      //     entry.best_weighted_score = weightedScore;
      //     entry.best_reason = sim.reason;
      //   }
      // }
    }
  }

  if (candidateMap.size === 0) {
    logRecommendationDebug("fallback:no-candidates", {
      userId,
      "recentActivities.length": recentActivities.length,
      favoriteSeedIds,
      ratingSeedIds,
      avgRating,
      ratingSeedItems,
      "seedWithWeight.size": seedWithWeight.size,
      "candidateMap.size": candidateMap.size,
      "topCandidates.length": 0,
      candidateSongIds: [],
      "songs.length": 0,
      "recommendations.length": 0,
    });
    return fallbackRecommendationsBySeedMetadata(seedWithWeight, limit);
  }

  /* BƯỚC 4: Sắp xếp và lấy top limit */
  function rankingScore(entry) {
    const discoveryBonus = entry.is_discovery_candidate ? 0.05 : 0;
    return entry.accumulated_score + discoveryBonus;
  }

  const topCandidates = [...candidateMap.entries()]
    .sort(([, a], [, b]) => rankingScore(b) - rankingScore(a))
    .slice(0, limit);

  if (topCandidates.length === 0) {
    logRecommendationDebug("fallback:no-top-candidates", {
      userId,
      "recentActivities.length": recentActivities.length,
      favoriteSeedIds,
      ratingSeedIds,
      avgRating,
      ratingSeedItems,
      "seedWithWeight.size": seedWithWeight.size,
      "candidateMap.size": candidateMap.size,
      "topCandidates.length": topCandidates.length,
      candidateSongIds: [],
      "songs.length": 0,
      "recommendations.length": 0,
    });
    return fallbackRecommendationsBySeedMetadata(seedWithWeight, limit);
  }

  /* BƯỚC 5: Lấy đầy đủ thông tin bài hát */
  const candidateSongIds = topCandidates.map(([song_id]) => song_id);

  const songs = await Song.findAll({
    where: {
      song_id: { [Op.in]: candidateSongIds },
      is_visible: true,
      status: "approved",
    },
    attributes: SONG_ATTRIBUTES,
    include: SONG_INCLUDE,
  });

  // Map song_id → song để ghép kết quả theo đúng thứ tự điểm
  const songMap = new Map(songs.map((s) => [s.song_id, s]));

  const recommendations = topCandidates
    .filter(([song_id]) => songMap.has(song_id))
    .map(([song_id, entry]) => {
      // Tìm lại data detail tương đồng giữa cặp bài hát (đọc từ bảng song_similarities hoặc memory)
      const seedId = entry.best_seed_id;

      // Giả định bạn xác định được nguồn hành vi của seedId (v dụ lấy từ list favorite/recent)
      let source = "recent_activity";
      if (favoriteSeedIds.includes(seedId)) source = "favorite";
      if (ratingSeedIds.includes(seedId)) source = "normalized_rating";

      // Lấy mảng mood chung từ kết quả đối sánh metadata của cặp bài
      // (Ở đây mình lấy ví dụ mảng mood tĩnh, bạn có thể truyền entry.common_moods vào)
      const commonMoods =
        entry.best_detail?.metadata_detail?.common_moods || [];
      const commonGenres =
        entry.best_detail?.metadata_detail?.common_genres || [];

      return {
        song: songMap.get(song_id),
        accumulated_score: Math.round(entry.accumulated_score * 10000) / 10000,

        // Ghi đè câu lý do kỹ thuật thành câu lý do trải nghiệm
        reason: buildUserCentricReason(
          entry.best_seed_title,
          source,
          entry.best_detail,
        ),

        endorsed_by_count: entry.endorsed_by_count,
        is_discovery_candidate: entry.is_discovery_candidate,
      };
    });

  logRecommendationDebug("result", {
    userId,
    "recentActivities.length": recentActivities.length,
    favoriteSeedIds,
    ratingSeedIds,
    avgRating,
    ratingSeedItems,
    "seedWithWeight.size": seedWithWeight.size,
    "candidateMap.size": candidateMap.size,
    "topCandidates.length": topCandidates.length,
    candidateSongIds,
    "songs.length": songs.length,
    "recommendations.length": recommendations.length,
  });

  if (recommendations.length === 0) {
    return fallbackRecommendationsBySeedMetadata(seedWithWeight, limit);
  }

  return recommendations;
}

/* =========================================================
   2b. getTrendingSongs — Fallback khi Cold Start
   ========================================================= */

/**
 * Trả về top bài hát trending khi user chưa có lịch sử nghe.
 * Dựa trên view_count — không cần tính toán phức tạp.
 *
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function getTrendingSongs(limit = 10) {
  const findTrendingSongs = (where) =>
    Song.findAll({
      where,
      order: [["view_count", "DESC"]],
      limit,
      attributes: SONG_ATTRIBUTES,
      include: SONG_INCLUDE,
    });

  let songs = await findTrendingSongs({
    is_visible: true,
    status: "approved",
  });

  if (songs.length === 0) {
    songs = await findTrendingSongs({ is_visible: true });
  }

  return songs.map((song) => ({
    song,
    accumulated_score: null,
    reason: "Bài hát đang thịnh hành.",
    endorsed_by_count: 0,
    is_discovery_candidate: true,
  }));
}

/* =========================================================
   3. getSongPairDebug — Debug đầy đủ 1 cặp bài hát
   ========================================================= */

/**
 * Trả toàn bộ thông tin tính toán của 1 cặp bài hát.
 * Dùng cho trang debug / demo với giảng viên.
 *
 * Nếu cặp đã có trong DB → đọc từ DB (nhanh).
 * Nếu chưa có → tính realtime và trả kết quả (không lưu).
 *
 * @param {number} songIdA
 * @param {number} songIdB
 * @returns {Promise<Object>}
 */
async function getSongPairDebug(songIdA, songIdB) {
  // Thử đọc từ DB trước (cả 2 chiều vì có thể lưu theo thứ tự ngược)
  const existing = await SongSimilarity.findOne({
    where: {
      [Op.or]: [
        { song_id_1: songIdA, song_id_2: songIdB },
        { song_id_1: songIdB, song_id_2: songIdA },
      ],
    },
  });

  // Lấy thông tin 2 bài hát
  const [songA, songB] = await Promise.all([
    Song.findByPk(songIdA, {
      attributes: ["song_id", "title", "duration", "audio_url", "image_url"],
      include: SONG_INCLUDE,
    }),
    Song.findByPk(songIdB, {
      attributes: ["song_id", "title", "duration", "audio_url", "image_url"],
      include: SONG_INCLUDE,
    }),
  ]);

  if (!songA || !songB) {
    const missing = !songA ? songIdA : songIdB;
    throw new Error(`Không tìm thấy bài hát với song_id = ${missing}`);
  }

  // Nếu đã có trong DB → trả luôn, kèm thông tin bài hát
  if (existing) {
    return {
      source: "cache", // Đọc từ DB pre-computed
      song_a: songA,
      song_b: songB,
      final_score: existing.final_score,
      metadata_score: existing.metadata_score,
      behavioral_score: existing.behavioral_score,
      reason: existing.reason,
      detail: existing.detail,
      updated_at: existing.updated_at,
    };
  }

  // Chưa có → tính realtime
  const [metaA, metaB] = await Promise.all([
    getSongMetadata(songIdA),
    getSongMetadata(songIdB),
  ]);

  const vectorMap = buildLyricsTfIdfVectorMap([metaA, metaB]);

  metaA.lyricsVector = vectorMap.get(metaA.song_id) || new Map();
  metaB.lyricsVector = vectorMap.get(metaB.song_id) || new Map();

  const { score: metadataScore, detail: metaDetail } =
    calculateMetadataSimilarity(metaA, metaB);

  const matrix = await buildUserSongInteractionMatrix();
  const { score: behavioralScore, detail: behavDetail } =
    calculateBehavioralSimilarity(songIdA, songIdB, matrix);

  const hasPositiveBehavior =
    behavDetail.reason_code === "success" && behavioralScore > 0;

  const finalScore = hasPositiveBehavior
    ? 0.6 * metadataScore + 0.4 * behavioralScore
    : metadataScore;

  const reason = buildReason(metaDetail, behavDetail);

  return {
    source: "realtime", // Tính trực tiếp, chưa cache
    song_a: songA,
    song_b: songB,
    final_score: Math.round(finalScore * 10000) / 10000,
    metadata_score: Math.round(metadataScore * 10000) / 10000,
    behavioral_score: Math.round(behavioralScore * 10000) / 10000,
    reason,
    detail: {
      metadata_detail: metaDetail,
      behavioral_detail: behavDetail,
    },
    updated_at: null,
  };
}

/**
 * Hàm tạo câu lý do cá nhân hóa dựa trên Dictionary Mapping
 */
// TỪ ĐIỂN DỊCH MOOD SANG NGÔN NGỮ TỰ NHIÊN
const MOOD_DICTIONARY = {
  // Nhóm Vui vẻ / Năng động
  energetic: "tràn đầy năng lượng",
  party: "sôi động, bùng nổ",
  banger: "cực cháy và bùng nổ",
  upbeat: "nhịp độ tươi vui",
  playful: "tươi vui, nhí nhảnh",
  cute: "dễ thương, kẹo ngọt",
  festive: "rộn ràng, mang không khí lễ hội",
  bright: "tươi sáng",
  cheerful: "tích cực, yêu đời",

  // Nhóm Lãng mạn / Thư giãn
  romantic: "lãng mạn, ngọt ngào",
  sweet: "ngọt ngào",
  chill: "nhẹ nhàng, thư giãn",
  relaxed: "thoải mái, êm dịu",
  peaceful: "bình yên",
  healing: "mang tính chữa lành",
  dreamy: "mộng mơ, bay bổng",
  warm: "ấm áp",

  // Nhóm Buồn / Suy tư
  sad: "buồn bã",
  melancholy: "u buồn, suy tư",
  heartbreak: "tan vỡ, da diết",
  lonely: "cô đơn, tĩnh lặng",
  regret: "đầy nuối tiếc",
  reflective: "đầy tự sự, suy ngẫm",
  nostalgic: "mang nhiều hoài niệm",
  passionate: "mãnh liệt, trào dâng",

  // Nhóm Chất / Cá tính
  groovy: "bắt tai, lôi cuốn",
  catchy: "giai điệu cực cuốn",
  retro: "âm hưởng hoài cổ",
  swag: "cực chất và cá tính",
  confident: "phong cách tự tin",
  inspirational: "đầy cảm hứng",
  folk: "âm hưởng dân gian đương đại",
};

// TỪ ĐIỂN DỊCH THỂ LOẠI (Dùng làm Fallback nếu không có Mood)
const GENRE_DICTIONARY = {
  "V-Pop": "âm nhạc V-Pop quen thuộc",
  "Rap Việt": "nhịp beat Rap/Hip-hop",
  "Dance Pop": "chất Pop Dance nhún nhảy",
  EDM: "chất điện tử EDM",
  Ballad: "giai điệu Ballad sâu lắng",
  Acoustic: "âm sắc mộc mạc (Acoustic)",
  Indie: "phong cách Indie tự do",
  "R&B": "giai điệu R&B cuốn hút",
  "Lo-fi": "không gian Lo-fi",
  Chill: "chất nhạc Chill thư giãn",
};

/**
 * Hàm tạo câu lý do cá nhân hóa toàn diện (Bao gồm Nội dung + Hành vi)
 */
function buildUserCentricReason(seedTitle, userActionSource, detail) {
  // Bóc tách dữ liệu an toàn
  const metaDetail = detail?.metadata_detail || {};
  const behavDetail = detail?.behavioral_detail || {};

  // 1. Dịch nguồn hành động của user
  let actionText = "bạn nghe gần đây";
  if (userActionSource === "favorite") actionText = "bạn đã thả tim";
  if (userActionSource === "normalized_rating") actionText = "bạn đánh giá cao";

  // 2. Thu thập các bằng chứng Nội dung (Content-Based)
  const contentReasons = [];

  // Mức độ ưu tiên 1: Cùng Nghệ sĩ (Tín hiệu rất mạnh với người dùng)
  if (metaDetail.common_artists?.length > 0) {
    contentReasons.push(
      `cùng do ${metaDetail.common_artists.join(", ")} thể hiện`,
    );
  }

  // Mức độ ưu tiên 2: Cùng Cảm xúc (Mood)
  if (metaDetail.common_moods?.length > 0) {
    const mappedVibes = metaDetail.common_moods
      .map((m) => MOOD_DICTIONARY[m])
      .filter(Boolean)
      .slice(0, 2); // Tránh câu quá dài
    if (mappedVibes.length > 0) {
      contentReasons.push(`mang âm hưởng ${mappedVibes.join(" và ")}`);
    }
  }

  // Mức độ ưu tiên 3: Cùng Chủ đề (Keywords) hoặc Lời bài hát (Lyrics)
  if (metaDetail.common_keywords?.length > 0) {
    contentReasons.push(`xoay quanh chủ đề ${metaDetail.common_keywords[0]}`);
  } else if (metaDetail.common_lyrics_terms?.length >= 2) {
    // Nếu thuật toán TF-IDF bắt được từ khóa đặc trưng
    const terms = metaDetail.common_lyrics_terms.slice(0, 2).join(", ");
    contentReasons.push(`mang những ca từ đồng điệu (${terms})`);
  }

  // Mức độ ưu tiên 4: Cùng Thể loại (Genre - Dùng làm Fallback)
  if (contentReasons.length === 0 && metaDetail.common_genres?.length > 0) {
    const mappedGenres = metaDetail.common_genres
      .map((g) => GENRE_DICTIONARY[g])
      .filter(Boolean);
    if (mappedGenres.length > 0) {
      contentReasons.push(`mang ${mappedGenres[0]}`);
    }
  }

  // Chọn tối đa 2 lý do nội dung để ghép câu cho tự nhiên
  const selectedContentReasons = contentReasons.slice(0, 2).join(", ");
  const vibeText = selectedContentReasons
    ? `, ${selectedContentReasons}`
    : ", mang sự đồng điệu về phong cách âm nhạc";

  // 3. Thu thập bằng chứng Hành vi (Collaborative Filtering)
  let communityText = "";
  // Nếu có từ 2 user trở lên cùng tương tác mạnh với cả 2 bài hát này
  if (
    behavDetail.common_user_count >= 2 &&
    behavDetail.adjusted_behavioral_score > 0
  ) {
    communityText =
      " và đang được nhiều người có cùng gu âm nhạc với bạn yêu thích";
  }

  // 4. Kết hợp thành câu hoàn chỉnh
  return `Được gợi ý từ ca khúc "${seedTitle}" mà ${actionText}${vibeText}${communityText}.`;
}

module.exports = {
  getSimilarSongs,
  getRecommendationsForUser,
  getSongPairDebug,
  getTrendingSongs,
  fallbackRecommendationsBySeedMetadata,
};
