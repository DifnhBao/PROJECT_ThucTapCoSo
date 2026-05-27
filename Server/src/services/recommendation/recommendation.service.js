const { Op }                           = require("sequelize");
const { SongSimilarity, Song, Artist,
        Genre, Favorite, UserActivity,
        Rating }                        = require("../../models");
const { getSongMetadata,
        calculateMetadataSimilarity }  = require("./metadataSimilarity.service");
const { buildUserSongInteractionMatrix } = require("./interactionScoring.service");
const { calculateBehavioralSimilarity }  = require("./behavioralSimilarity.service");
const { buildReason }                    = require("./hybridSimilarity.service");

const DEBUG_RECOMMENDATION =
  process.env.DEBUG_RECOMMENDATION === "true" ||
  process.env.RECOMMENDATION_DEBUG === "true";

/* =========================================================
   HELPER: include để lấy thông tin đầy đủ của Song
   Dùng chung ở nhiều chỗ để không lặp code.
   ========================================================= */

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
        as: "song2",                         // Bài tương tự (phía B)
        where: { is_visible: true, status: "approved" },
        attributes: [
          "song_id", "title", "duration",
          "audio_url", "image_url", "view_count",
        ],
        include: SONG_INCLUDE,
      },
    ],
  });

  if (rows.length > 0) {
    return rows.map((row) => ({
      // Thông tin bài hát tương tự
      song:             row.song2,
      // Điểm & lý do
      final_score:      row.final_score,
      metadata_score:   row.metadata_score,
      behavioral_score: row.behavioral_score,
      reason:           row.reason,
      detail:           row.detail,
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
        "song_id", "title", "duration",
        "audio_url", "image_url", "view_count",
      ],
      include: SONG_INCLUDE,
    }),
  ]);

  const metadataList = await Promise.all(
    songs.map((song) => getSongMetadata(song.song_id))
  );
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
   2. getRecommendationsForUser — Gợi ý cá nhân hoá
   ========================================================= */

/**
 * Gợi ý bài hát cá nhân hoá cho người dùng theo thuật toán:
 *
 *   Bước 1 — Tìm "seed songs" (bài gốc của user):
 *     - Top 10 bài nghe gần đây (UserActivity)
 *     - Top 5 bài yêu thích (Favorite)
 *     - Top 5 bài đánh giá cao nhất (Rating score >= 4)
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
  /* ── BƯỚC 1: Lấy seed songs ──────────────────────────── */

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
      .map(([song_id]) => song_id)
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

  // Seed 3: Bài được đánh giá cao (4–5 sao)
  const highRatings = await Rating.findAll({
    where: { user_id: userId, score: { [Op.gte]: 4 } },
    attributes: ["song_id", "score"],
    order: [["score", "DESC"]],
    limit: 5,
  });
  const ratingSeedIds = highRatings.map((r) => r.song_id);

  // Gộp seed, tránh trùng lặp; gán trọng số theo nguồn
  // Favorite > Recent > Rating (favorite là tín hiệu rõ nhất)
  const seedWithWeight = [
    ...favoriteSeedIds.map((id) => ({ song_id: id, weight: 1.5 })),
    ...recentSeedIds.map((id)   => ({ song_id: id, weight: 1.0 })),
    ...ratingSeedIds.map((id)   => ({ song_id: id, weight: 1.2 })),
  ].reduce((acc, { song_id, weight }) => {
    // Nếu 1 bài xuất hiện ở nhiều nguồn → giữ trọng số cao nhất
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

  /* ── BƯỚC 2 & 3: Expand seed và gộp điểm ────────────── */
  const candidateMap = new Map();
  // candidateMap: song_id → { accumulated_score, reasons[] }

  for (const [seedId, weight] of seedWithWeight.entries()) {
    const similars = await SongSimilarity.findAll({
      where: { song_id_1: seedId },
      order: [["final_score", "DESC"]],
      limit: 20, // Top 20 gợi ý mỗi seed
      attributes: ["song_id_2", "final_score", "reason"],
    });

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
          reasons: [],
          is_discovery_candidate: isDiscoveryCandidate,
        });
      }

      const entry = candidateMap.get(candId);
      entry.accumulated_score += weightedScore;
      entry.is_discovery_candidate =
        entry.is_discovery_candidate || isDiscoveryCandidate;
      if (sim.reason) entry.reasons.push(sim.reason);
    }
  }

  if (candidateMap.size === 0) {
    logRecommendationDebug("fallback:no-candidates", {
      userId,
      "recentActivities.length": recentActivities.length,
      favoriteSeedIds,
      ratingSeedIds,
      "seedWithWeight.size": seedWithWeight.size,
      "candidateMap.size": candidateMap.size,
      "topCandidates.length": 0,
      candidateSongIds: [],
      "songs.length": 0,
      "recommendations.length": 0,
    });
    return getTrendingSongs(limit);
  }

  /* ── BƯỚC 4: Sắp xếp và lấy top limit ──────────────── */
  const topCandidates = [...candidateMap.entries()]
    .sort(([, a], [, b]) => {
      if (a.is_discovery_candidate !== b.is_discovery_candidate) {
        return a.is_discovery_candidate ? -1 : 1;
      }
      return b.accumulated_score - a.accumulated_score;
    })
    .slice(0, limit);

  if (topCandidates.length === 0) {
    logRecommendationDebug("fallback:no-top-candidates", {
      userId,
      "recentActivities.length": recentActivities.length,
      favoriteSeedIds,
      ratingSeedIds,
      "seedWithWeight.size": seedWithWeight.size,
      "candidateMap.size": candidateMap.size,
      "topCandidates.length": topCandidates.length,
      candidateSongIds: [],
      "songs.length": 0,
      "recommendations.length": 0,
    });
    return getTrendingSongs(limit);
  }

  /* ── BƯỚC 5: Lấy đầy đủ thông tin bài hát ──────────── */
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
    .filter(([song_id]) => songMap.has(song_id)) // Bỏ bài đã bị ẩn/xóa
    .map(
      ([song_id, { accumulated_score, reasons, is_discovery_candidate }]) => ({
        song: songMap.get(song_id),
        accumulated_score: Math.round(accumulated_score * 10000) / 10000,
        // Lấy lý do đầu tiên (ngắn gọn nhất) để hiển thị
        reason: reasons[0] || "Gợi ý dựa trên sở thích của bạn.",
        // Số seed đề xuất bài này — số càng cao càng đáng tin cậy
        endorsed_by_count: reasons.length,
        is_discovery_candidate,
      }),
    );

  logRecommendationDebug("result", {
    userId,
    "recentActivities.length": recentActivities.length,
    favoriteSeedIds,
    ratingSeedIds,
    "seedWithWeight.size": seedWithWeight.size,
    "candidateMap.size": candidateMap.size,
    "topCandidates.length": topCandidates.length,
    candidateSongIds,
    "songs.length": songs.length,
    "recommendations.length": recommendations.length,
  });

  if (recommendations.length === 0) {
    return getTrendingSongs(limit);
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
      source:           "cache",     // Đọc từ DB pre-computed
      song_a:           songA,
      song_b:           songB,
      final_score:      existing.final_score,
      metadata_score:   existing.metadata_score,
      behavioral_score: existing.behavioral_score,
      reason:           existing.reason,
      detail:           existing.detail,
      updated_at:       existing.updated_at,
    };
  }

  // Chưa có → tính realtime
  const [metaA, metaB] = await Promise.all([
    getSongMetadata(songIdA),
    getSongMetadata(songIdB),
  ]);

  const { score: metadataScore, detail: metaDetail } =
    calculateMetadataSimilarity(metaA, metaB);

  const matrix = await buildUserSongInteractionMatrix();
  const { score: behavioralScore, detail: behavDetail } =
    calculateBehavioralSimilarity(songIdA, songIdB, matrix);

  const hasBehavior = behavDetail.reason_code === "success";
  const finalScore = hasBehavior
    ? 0.6 * metadataScore + 0.4 * behavioralScore
    : metadataScore;

  const reason = buildReason(metaDetail, behavDetail);

  return {
    source:           "realtime",   // Tính trực tiếp, chưa cache
    song_a:           songA,
    song_b:           songB,
    final_score:      Math.round(finalScore      * 10000) / 10000,
    metadata_score:   Math.round(metadataScore   * 10000) / 10000,
    behavioral_score: Math.round(behavioralScore * 10000) / 10000,
    reason,
    detail: {
      metadata_detail:   metaDetail,
      behavioral_detail: behavDetail,
    },
    updated_at: null,
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  getSimilarSongs,
  getRecommendationsForUser,
  getSongPairDebug,
  getTrendingSongs,
};
