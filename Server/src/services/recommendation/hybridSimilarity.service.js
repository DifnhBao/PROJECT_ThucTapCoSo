const { Song }                          = require("../../models");
const { SongSimilarity }               = require("../../models");
const { getSongMetadata,
        calculateMetadataSimilarity }  = require("./metadataSimilarity.service");
const { buildUserSongInteractionMatrix,
}                                       = require("./interactionScoring.service");
const { calculateBehavioralSimilarity } = require("./behavioralSimilarity.service");

/* =========================================================
   PHẦN 1: TẠO CÂU "REASON" DỄ HIỂU
   ========================================================= */

/**
 * @param {Object} metaDetail  — detail từ calculateMetadataSimilarity()
 * @param {Object} behavDetail — detail từ calculateBehavioralSimilarity()
 * @returns {string}
 */
function buildReason(metaDetail, behavDetail) {
  const parts = [];

  if (metaDetail.common_genres.length > 0) {
    parts.push(`Cùng thể loại ${metaDetail.common_genres.join(", ")}`);
  }

  if (metaDetail.common_moods.length > 0) {
    parts.push(`cùng mood ${metaDetail.common_moods.join(", ")}`);
  }

  if (metaDetail.common_artists.length > 0) {
    parts.push(`cùng nghệ sĩ ${metaDetail.common_artists.join(", ")}`);
  }

  if (metaDetail.common_keywords.length > 0) {
    parts.push(`chủ đề tương tự (${metaDetail.common_keywords.slice(0, 3).join(", ")})`);
  }

  if (behavDetail.reason_code === "success" && behavDetail.common_user_count > 0) {
    parts.push(
      `và có ${behavDetail.common_user_count} người dùng có mẫu hành vi nghe tương tự`
    );
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

  // Behavioral (Collaborative) score
  const { score: behavioralScore, detail: behavDetail } =
    calculateBehavioralSimilarity(metaA.song_id, metaB.song_id, matrix);

  // Nếu không có dữ liệu hành vi → fallback 100% vào metadata
  const hasBehavior = behavDetail.reason_code === "success";

  const finalScore = hasBehavior
    ? 0.6 * metadataScore + 0.4 * behavioralScore
    : metadataScore;

  return {
    finalScore:      Math.round(finalScore      * 10000) / 10000,
    metadataScore:   Math.round(metadataScore   * 10000) / 10000,
    behavioralScore: Math.round(behavioralScore * 10000) / 10000,
    metaDetail,
    behavDetail,
  };
}

/* =========================================================
   PHẦN 3: REBUILD TOÀN BỘ BẢNG SONG_SIMILARITIES
   ========================================================= */

/**
 * Tính lại toàn bộ điểm tương đồng giữa các bài hát và lưu vào DB.
 *
 * Quy trình:
 *   1. Lấy tối đa `limit` bài hát đang visible + approved
 *   2. Build ma trận tương tác user-song 1 lần duy nhất (đắt nhất)
 *   3. Lấy metadata từng bài hát song song (Promise.all)
 *   4. Duyệt qua N*(N-1)/2 cặp, tính hybrid score
 *   5. Upsert 2 chiều (A→B và B→A) vào bảng song_similarities
 *      → Query "WHERE song_id_1 = X" sẽ nhanh, không cần OR
 *
 * Dataset 100 bài → 4950 cặp → 9900 upsert rows — hoàn toàn ổn cho demo.
 *
 * @param {{ limit?: number }} options
 * @returns {Promise<{ processed_pairs: number, song_count: number, duration_ms: number }>}
 */
async function rebuildAllSongSimilarities({ limit = 200 } = {}) {
  const startTime = Date.now();
  console.log(`\n[HybridSimilarity] ▶ Bắt đầu rebuild. Giới hạn ${limit} bài hát...`);

  // ── BƯỚC 1: Lấy danh sách bài hát hợp lệ ─────────────────
  const songs = await Song.findAll({
    where: { is_visible: true, status: "approved" },
    attributes: ["song_id"],
    limit,
    order: [["view_count", "DESC"]], // Ưu tiên bài phổ biến trước
  });

  const songCount = songs.length;
  console.log(`[HybridSimilarity] ✔ Tìm thấy ${songCount} bài hát hợp lệ.`);

  if (songCount < 2) {
    console.log("[HybridSimilarity] ⚠ Cần ít nhất 2 bài hát để tính tương đồng. Bỏ qua.");
    return { processed_pairs: 0, song_count: songCount, duration_ms: Date.now() - startTime };
  }

  const songIds = songs.map((s) => s.song_id);

  // ── BƯỚC 2: Build ma trận tương tác 1 lần ────────────────
  console.log("[HybridSimilarity] ⏳ Đang build ma trận tương tác người dùng...");
  const matrix = await buildUserSongInteractionMatrix();
  console.log(`[HybridSimilarity] ✔ Ma trận sẵn sàng. ${matrix.size} bài hát có dữ liệu hành vi.`);

  // ── BƯỚC 3: Lấy metadata từng bài song song ──────────────
  console.log("[HybridSimilarity] ⏳ Đang tải metadata bài hát...");
  const metadataList = await Promise.all(songIds.map((id) => getSongMetadata(id)));

  // Map để tra cứu nhanh theo song_id
  const metadataMap = new Map(metadataList.map((m) => [m.song_id, m]));
  console.log("[HybridSimilarity] ✔ Metadata đã sẵn sàng.");

  // ── BƯỚC 4: Duyệt cặp và tính điểm ──────────────────────
  const totalPairs = (songCount * (songCount - 1)) / 2;
  console.log(`[HybridSimilarity] ⏳ Bắt đầu tính ${totalPairs} cặp bài hát...`);

  let processedPairs = 0;
  const BATCH_SIZE = 200; // Số cặp ghi vào DB mỗi lần để tránh query quá lớn
  let upsertBuffer = [];  // [{song_id_1, song_id_2, ...}, ...]

  const flushBuffer = async () => {
    if (upsertBuffer.length === 0) return;
    // upsert = INSERT ... ON DUPLICATE KEY UPDATE (hoạt động nhờ unique index uq_song_pair)
    await Promise.all(
      upsertBuffer.map((row) =>
        SongSimilarity.upsert(row)
      )
    );
    upsertBuffer = [];
  };

  for (let i = 0; i < songCount - 1; i++) {
    const metaA = metadataMap.get(songIds[i]);

    for (let j = i + 1; j < songCount; j++) {
      const metaB = metadataMap.get(songIds[j]);

      const { finalScore, metadataScore, behavioralScore, metaDetail, behavDetail } =
        computeHybridPair(metaA, metaB, matrix);

      const reason  = buildReason(metaDetail, behavDetail);
      const detail  = { metadata_detail: metaDetail, behavioral_detail: behavDetail };
      const now     = new Date();

      // Lưu 2 chiều để query "WHERE song_id_1 = X" luôn hoạt động
      upsertBuffer.push({
        song_id_1:        metaA.song_id,
        song_id_2:        metaB.song_id,
        metadata_score:   metadataScore,
        behavioral_score: behavioralScore,
        final_score:      finalScore,
        reason,
        detail,
        updated_at:       now,
      });

      upsertBuffer.push({
        song_id_1:        metaB.song_id,
        song_id_2:        metaA.song_id,
        metadata_score:   metadataScore,
        behavioral_score: behavioralScore,
        final_score:      finalScore,
        reason,
        detail,
        updated_at:       now,
      });

      processedPairs++;

      // Flush buffer khi đủ batch
      if (upsertBuffer.length >= BATCH_SIZE * 2) {
        await flushBuffer();
      }

      // Log tiến độ mỗi 500 cặp
      if (processedPairs % 500 === 0) {
        const pct = ((processedPairs / totalPairs) * 100).toFixed(1);
        console.log(`[HybridSimilarity]   ... ${processedPairs}/${totalPairs} cặp (${pct}%)`);
      }
    }
  }

  // Flush phần còn lại trong buffer
  await flushBuffer();

  const durationMs = Date.now() - startTime;
  console.log(
    `[HybridSimilarity] ✅ Hoàn thành! ${processedPairs} cặp xử lý trong ${(durationMs / 1000).toFixed(2)}s.\n`
  );

  return {
    processed_pairs: processedPairs,
    song_count:      songCount,
    duration_ms:     durationMs,
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  rebuildAllSongSimilarities,
  computeHybridPair, // Export để dễ unit test từng cặp
  buildReason,       // Export để test câu reason riêng lẻ
};
