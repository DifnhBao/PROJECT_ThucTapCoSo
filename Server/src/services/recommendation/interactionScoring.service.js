const { UserActivity, Favorite, Rating } = require("../../models");

/* =========================================================
   PHẦN 1: TÍNH ĐIỂM MỘT PHIÊN NGHE (Activity Score)

   Mục tiêu: chuyển dữ liệu hành vi thô (implicit feedback)
   từ bảng UserActivities thành một con số điểm định lượng.
   Điểm càng cao → user càng thích bài hát đó.
   ========================================================= */

/**
 * Tính điểm tương tác cho một phiên nghe (1 record UserActivity).
 *
 * Thang điểm tối đa lý thuyết ≈ 8.0 (không bị skip, nghe full, không tua).
 * Điểm âm có thể xảy ra nếu bỏ qua ngay đầu bài.
 *
 * @param {Object} activity  — 1 instance của model UserActivity
 * @returns {number}         — điểm tương tác của phiên nghe này
 */
function calculateActivityScore(activity) {
  const {
    total_listened_time,
    song_duration,
    max_position_reached,
    exit_reason,
    seek_count = 0,
  } = activity;

  // ── Tỉ lệ nghe & hoàn thành, clamp về [0, 1] ──────────
  // listen_ratio: tổng thời gian thực sự nghe / tổng thời lượng bài
  // (user có thể pause/resume nhiều lần, nên đây là implicit engagement)
  const listen_ratio =
    song_duration > 0
      ? Math.min(1, Math.max(0, total_listened_time / song_duration))
      : 0;

  // completion_ratio: user đã kéo/nghe đến vị trí xa nhất nào của bài
  // (khác listen_ratio: user có thể tua nhanh đến cuối nhưng không thực sự nghe)
  const completion_ratio =
    song_duration > 0
      ? Math.min(1, Math.max(0, max_position_reached / song_duration))
      : 0;

  // ── Điểm cơ sở ────────────────────────────────────────
  // Mỗi lần phát hợp lệ (đã qua validation >20s ở view_count) = +1
  let score = 1;

  // ── Bonus hoàn thành (+0 đến +4) ──────────────────────
  // User nghe hết bài → tín hiệu mạnh nhất của sự yêu thích
  score += 4 * completion_ratio;

  // ── Bonus thời gian nghe thực tế (+0 đến +3) ──────────
  // Phân biệt user "để chạy nền" với user "thật sự nghe"
  score += 3 * listen_ratio;

  // ── Penalty bỏ qua sớm (-4) ───────────────────────────
  // Nếu user chủ động skip VÀ chưa nghe đến 30% → tín hiệu không thích
  if (exit_reason === "skipped" && listen_ratio < 0.3) {
    score -= 4;
  }

  // ── Penalty tua nhiều (-0.2 mỗi lần, tối đa -1) ───────
  // Seek nhiều có thể là do bài không hay hoặc user đang tìm đoạn cụ thể;
  // áp nhẹ để không phạt oan những bài có nhiều đoạn hay
  const seek_penalty = Math.min(1, seek_count * 0.2);
  score -= seek_penalty;

  return score;
}

/* =========================================================
   PHẦN 2: XÂY MA TRẬN TƯƠNG TÁC USER-SONG

   Đây là bước cốt lõi của Collaborative Filtering (CF).
   Ma trận User-Song = bảng điểm, mỗi ô là mức độ user thích 1 bài.
   Chúng ta gộp CẢ 3 nguồn tín hiệu:
     - Implicit: UserActivity (hành vi nghe)
     - Explicit: Favorite     (bấm tim)
     - Explicit: Rating       (chấm sao)
   ========================================================= */

/**
 * Xây ma trận tương tác User-Song từ toàn bộ dữ liệu trong DB.
 *
 * Cấu trúc trả về (Item-centric, thuận tiện cho Item-Item CF):
 *   Map {
 *     song_id_1 => Map { user_id_A => 9.2, user_id_B => 3.1, ... },
 *     song_id_2 => Map { user_id_A => 7.5, ... },
 *     ...
 *   }
 *
 * Lý do dùng Map lồng Map thay vì plain object:
 *   - Key là số nguyên (user_id, song_id) → Map an toàn hơn object
 *   - Dễ iterate khi tính Cosine Similarity giữa 2 bài hát
 *
 * @returns {Promise<Map<number, Map<number, number>>>}
 */
async function buildUserSongInteractionMatrix() {
  // ── Kết quả cuối cùng: song_id → Map(user_id → score) ─
  const matrix = new Map();

  // Hàm nội bộ: cộng điểm an toàn vào ma trận
  function addScore(songId, userId, delta) {
    if (!matrix.has(songId)) {
      matrix.set(songId, new Map());
    }
    const songMap = matrix.get(songId);
    songMap.set(userId, (songMap.get(userId) || 0) + delta);
  }

  // ── NGUỒN 1: UserActivity (Implicit Feedback) ──────────
  // Lấy toàn bộ phiên nghe, không cần join Song/User vì chỉ cần id + số liệu
  const activities = await UserActivity.findAll({
    attributes: [
      "user_id",
      "song_id",
      "total_listened_time",
      "song_duration",
      "max_position_reached",
      "exit_reason",
      "seek_count",
    ],
  });

  for (const activity of activities) {
    const actScore = calculateActivityScore(activity);
    addScore(activity.song_id, activity.user_id, actScore);
  }

  // ── NGUỒN 2: Favorite (Explicit — Strong Positive Signal) ─
  // User bấm tim = tín hiệu thích mạnh hơn hành vi nghe bình thường
  // Hệ số +5 ≈ tương đương nghe gần hết bài 1 lần
  const favorites = await Favorite.findAll({
    attributes: ["user_id", "song_id"],
  });

  for (const fav of favorites) {
    addScore(fav.song_id, fav.user_id, 5);
  }

  // ── NGUỒN 3: Rating (Explicit — Scored Feedback) ───────
  // User chấm sao từ 1–5, nhân 2 để đưa về thang [2, 10]
  // Giúp đồng bộ magnitude với điểm activity (thang ~8)
  const ratings = await Rating.findAll({
    attributes: ["user_id", "song_id", "score"],
  });

  for (const rating of ratings) {
    addScore(rating.song_id, rating.user_id, rating.score * 2);
  }

  return matrix;
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  calculateActivityScore,
  buildUserSongInteractionMatrix,
};
