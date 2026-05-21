const { buildUserSongInteractionMatrix } = require("./interactionScoring.service");

/* =========================================================
   PHẦN 1: HÀM TIỆN ÍCH (Utility Functions)
   ========================================================= */

/**
 * Tính Cosine Similarity giữa 2 vector (được biểu diễn bằng Map).
 * Công thức: (A . B) / (||A|| * ||B||)
 * 
 * @param {Map<number, number>} vectorA - Vector tương tác của bài A (userId -> score)
 * @param {Map<number, number>} vectorB - Vector tương tác của bài B (userId -> score)
 * @returns {{ score: number, common_user_count: number }}
 */
function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.size === 0 || vectorB.size === 0) {
    return { score: 0, common_user_count: 0 };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let commonUserCount = 0;

  // Tính norm của A
  for (const [userId, scoreA] of vectorA.entries()) {
    normA += scoreA * scoreA;
    if (vectorB.has(userId)) {
      const scoreB = vectorB.get(userId);
      dotProduct += scoreA * scoreB;
      commonUserCount++;
    }
  }

  // Tính norm của B
  for (const scoreB of vectorB.values()) {
    normB += scoreB * scoreB;
  }

  if (normA === 0 || normB === 0) {
    return { score: 0, common_user_count: 0 };
  }

  const score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  return {
    score: Math.min(1, Math.max(0, score)), // Clamp [0, 1] để an toàn
    common_user_count: commonUserCount
  };
}

/* =========================================================
   PHẦN 2: TÍNH ĐIỂM TƯƠNG ĐỒNG HÀNH VI (Collaborative Filtering)
   ========================================================= */

/**
 * Tính độ tương đồng hành vi (Item-based Collaborative Filtering) 
 * giữa 2 bài hát dựa trên ma trận tương tác.
 * 
 * @param {number} songIdA - ID bài hát A
 * @param {number} songIdB - ID bài hát B
 * @param {Map<number, Map<number, number>>} matrix - Ma trận user-song interaction
 * @returns {{ score: number, detail: Object }}
 */
function calculateBehavioralSimilarity(songIdA, songIdB, matrix) {
  const vectorA = matrix.get(songIdA);
  const vectorB = matrix.get(songIdB);

  const vectorASize = vectorA ? vectorA.size : 0;
  const vectorBSize = vectorB ? vectorB.size : 0;

  // Xử lý Cold Start: Thiếu dữ liệu tương tác để kết luận có ý nghĩa
  // (ví dụ bài hát quá mới, hoặc chưa có ai nghe chung)
  if (!vectorA || !vectorB || vectorASize === 0 || vectorBSize === 0) {
    return {
      score: 0,
      detail: {
        common_user_count: 0,
        vector_a_size: vectorASize,
        vector_b_size: vectorBSize,
        reason_code: "insufficient_behavior_data"
      }
    };
  }

  const { score, common_user_count } = cosineSimilarity(vectorA, vectorB);

  // Nếu không có user nào nghe chung, điểm cũng bằng 0
  if (common_user_count === 0) {
    return {
      score: 0,
      detail: {
        common_user_count: 0,
        vector_a_size: vectorASize,
        vector_b_size: vectorBSize,
        reason_code: "no_common_users"
      }
    };
  }

  return {
    score: Math.round(score * 10000) / 10000,
    detail: {
      common_user_count,
      vector_a_size: vectorASize,
      vector_b_size: vectorBSize,
      reason_code: "success"
    }
  };
}

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  cosineSimilarity,
  calculateBehavioralSimilarity,
};
