const {
  calculateMetadataSimilarity,
} = require("./metadataSimilarity.service");
const {
  calculateBehavioralSimilarity,
} = require("./behavioralSimilarity.service");
const config = require("./config");

/* =========================================================
   PHẦN 1: TẠO CÂU REASON DỄ HIỂU
   ========================================================= */

/**
 * @param {Object} metaDetail  — detail từ calculateMetadataSimilarity()
 * @param {Object} behavDetail — detail từ calculateBehavioralSimilarity()
 * @returns {string}
 */
function buildReason(metaDetail, behavDetail) {
  const parts = [];

  const commonGenres = Array.isArray(metaDetail?.common_genres)
    ? metaDetail.common_genres
    : [];
  const commonMoods = Array.isArray(metaDetail?.common_moods)
    ? metaDetail.common_moods
    : [];
  const commonArtists = Array.isArray(metaDetail?.common_artists)
    ? metaDetail.common_artists
    : [];
  const commonKeywords = Array.isArray(metaDetail?.common_keywords)
    ? metaDetail.common_keywords
    : [];

  const commonLyricsTerms = Array.isArray(metaDetail?.common_lyrics_terms)
    ? metaDetail.common_lyrics_terms
    : [];

  const lyricsSimilarity = Number(metaDetail?.lyrics_similarity || 0);

  const behaviorReasonCode = behavDetail?.reason_code;
  const commonUserCount = Number(behavDetail?.common_user_count || 0);
  const rawCosineScore = Number(behavDetail?.raw_cosine_score || 0);
  const adjustedBehavioralScore = Number(
    behavDetail?.adjusted_behavioral_score || 0,
  );
  const confidence = Number(behavDetail?.confidence || 0);

  const GENERIC_MOOD_TERMS = new Set([
    "low",
    "medium",
    "high",
    "positive",
    "neutral",
    "negative",
  ]);
  const displayMoods = commonMoods.filter(
    (mood) => !GENERIC_MOOD_TERMS.has(mood),
  );

  if (commonGenres.length > 0) {
    parts.push(`Cùng thể loại ${commonGenres.join(", ")}`);
  }

  if (displayMoods.length > 0) {
    parts.push(`cùng mood ${displayMoods.join(", ")}`);
  }

  if (commonArtists.length > 0) {
    parts.push(`cùng nghệ sĩ ${commonArtists.join(", ")}`);
  }

  if (commonKeywords.length > 0) {
    parts.push(`chủ đề tương tự (${commonKeywords.slice(0, 3).join(", ")})`);
  }

  if (lyricsSimilarity >= 0.03 && commonLyricsTerms.length >= 2) {
    parts.push(
      `lời bài hát có chủ đề tương đồng (${commonLyricsTerms
        .slice(0, 4)
        .join(", ")})`,
    );
  }

  if (
    behaviorReasonCode === "success" &&
    commonUserCount > 0 &&
    rawCosineScore > 0 &&
    adjustedBehavioralScore > 0
  ) {
    if (confidence >= 0.5) {
      parts.push(
        `có ${commonUserCount} người dùng chung củng cố tín hiệu hành vi`,
      );
    } else {
      parts.push(
        `tín hiệu hành vi còn hạn chế (${commonUserCount} người dùng chung)`,
      );
    }
  }

  if (parts.length === 0) return "Gợi ý dựa trên phân tích đặc trưng âm nhạc.";

  return parts.join(", ") + ".";
}

/* =========================================================
   PHẦN 2: TÍNH HYBRID SCORE CHO 1 CẶP BÀI HÁT
   ========================================================= */

/**
 * Tính hybrid score cho cặp (metaA, metaB).
 *
 * Công thức:
 *   Nếu có behavioral data:  final = 0.6 * metadata + 0.4 * behavioral
 *   Nếu thiếu behavioral:    final = metadata_score (fallback thuần Content-Based)
 *
 * Lý do trọng số 0.6/0.4: metadata bao giờ cũng có (mọi bài hát đều có genre),
 * còn behavioral phụ thuộc vào lịch sử nghe → ưu tiên metadata hơn để tránh
 * cold-start kéo toàn bộ score về 0.
 *
 * @param {Object} metaA   — kết quả getSongMetadata() cho bài A
 * @param {Object} metaB   — kết quả getSongMetadata() cho bài B
 * @param {Map}    matrix  — ma trận tương tác từ buildUserSongInteractionMatrix()
 * @returns {{ finalScore, metadataScore, behavioralScore, metaDetail, behavDetail }}
 */
function computeHybridPair(metaA, metaB, matrix) {
  // Content-Based score
  const { score: metadataScore, detail: metaDetail } =
    calculateMetadataSimilarity(metaA, metaB);

  // Behavioral score
  const { score: behavioralScore, detail: behavDetail } =
    calculateBehavioralSimilarity(metaA.song_id, metaB.song_id, matrix);

  // Nếu không có dữ liệu hành vi → fallback 100% vào metadata
  const hasPositiveBehavior =
    behavDetail.reason_code === "success" && behavioralScore > 0;

  const finalScore = hasPositiveBehavior
    ? config.metadataWeight * metadataScore + config.behavioralWeight * behavioralScore
    : metadataScore;

  return {
    finalScore: Math.round(finalScore * 10000) / 10000,
    metadataScore: Math.round(metadataScore * 10000) / 10000,
    behavioralScore: Math.round(behavioralScore * 10000) / 10000,
    metaDetail,
    behavDetail,
  };
}

// Compatibility entrypoint for offline callers. HTTP never invokes rebuild.
async function rebuildAllSongSimilarities() {
  return require('./snapshot.service').rebuild();
}

module.exports = {
  rebuildAllSongSimilarities,
  computeHybridPair,
  buildReason,
};
