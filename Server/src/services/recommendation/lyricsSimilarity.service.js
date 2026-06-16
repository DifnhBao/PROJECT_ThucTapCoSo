const VIETNAMESE_STOPWORDS = new Set([
  // Đại từ nhân xưng đại trà
  "anh", "em", "ta", "tôi", "mình", "người", "ai", "hắn", "y", "chúng", "bọn", "nó",
  
  // Từ nối, quan hệ từ, giới từ
  "là", "và", "của", "cho", "với", "trong", "ngoài", "về", "đến", "từ", "ở", "nơi",
  "mà", "như", "thì", "nếu", "vì", "nên", "để", "bởi", "tại", "nhưng", "tuy", "dù",
  "hay", "hoặc", "cùng", "qua", "lại", "lên", "xuống", "ra", "vào", "sang",
  
  // Từ chức năng, trạng từ chỉ thời gian/mức độ
  "không", "có", "đã", "sẽ", "đang", "vẫn", "còn", "cũng", "chỉ", "mới", "cứ",
  "rất", "quá", "lắm", "hơi", "hẳn", "đều", "từng", "từng", "khi", "lúc", "nào",
  "nay", "mai", "qua", "rồi", "thôi", "nữa", "nhau", "nhiều", "chưa", "bao", "giờ",
  
  // Lượng từ, từ chỉ định
  "một", "những", "các", "mọi", "mỗi", "từng", "này", "kia", "đó", "ấy", "đây", "đấy",
  
  // Thán từ, từ đệm thường gặp trong nhạc (Rác dữ liệu)
  "ơi", "à", "ừ", "nhé", "nha", "đâu", "sao", "vậy", "thế", "cơ", "hả",
  "oh", "ooh", "yeah", "baby", "alo", "ah", "la", "ok", "hey", "ha", "uh"
]);

function normalizeLyrics(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFC")
    // Giữ lại chữ cái và số, xóa các ký tự đặc biệt, dấu câu
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    // Xóa khoảng trắng thừa
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLyrics(text) {
  const rawWords = normalizeLyrics(text)
    .split(" ")
    .filter((w) => w.length > 0);

  // 1. Unigram: Lọc bỏ stopword để lấy các từ đơn mang ý nghĩa
  const unigrams = rawWords.filter((w) => !VIETNAMESE_STOPWORDS.has(w));

  // 2. Bigram: Ghép từ để bắt các cụm từ (như "tình yêu", "cô đơn")
  const bigrams = [];

  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];

    // Chỉ ghép Bigram khi CẢ HAI từ đều mang ý nghĩa (Không nằm trong Stopwords)
    const isW1Meaningful = !VIETNAMESE_STOPWORDS.has(w1);
    const isW2Meaningful = !VIETNAMESE_STOPWORDS.has(w2);

    if (isW1Meaningful && isW2Meaningful) {
      bigrams.push(`${w1} ${w2}`);
    }
  }

  return [...unigrams, ...bigrams];
}

function buildLyricsTfIdfVectorMap(metadataList) {
  const docs = metadataList.map((meta) => {
    const tokens = tokenizeLyrics(meta.lyrics);
    const tf = new Map();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    const total = tokens.length || 1;
    for (const [token, count] of tf.entries()) {
      tf.set(token, count / total);
    }

    return {
      song_id: meta.song_id,
      tf,
      uniqueTokens: new Set(tokens),
    };
  });

  const N = docs.length;
  const df = new Map();

  for (const doc of docs) {
    for (const token of doc.uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const vectorMap = new Map();

  for (const doc of docs) {
    const vector = new Map();

    for (const [token, tfValue] of doc.tf.entries()) {
      const idf = Math.log((N + 1) / ((df.get(token) || 0) + 1)) + 1;
      vector.set(token, tfValue * idf);
    }

    vectorMap.set(doc.song_id, vector);
  }

  return vectorMap;
}

function cosineSimilaritySparse(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.size === 0 || vectorB.size === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  // Tính Tích vô hướng (Dot Product) và Độ dài vector A (Norm A)
  for (const [token, valueA] of vectorA.entries()) {
    normA += valueA * valueA;
    if (vectorB.has(token)) {
      dot += valueA * vectorB.get(token);
    }
  }

  // Tính Độ dài vector B (Norm B)
  for (const valueB of vectorB.values()) {
    normB += valueB * valueB;
  }

  // Tránh lỗi chia cho 0
  if (normA === 0 || normB === 0) return 0;

  const score = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Kỹ thuật Clamp an toàn: Ép kiểu kết quả vào đúng giới hạn [0, 1]
  return Math.min(1, Math.max(0, score));
}

function getCommonTopLyricsTerms(vectorA, vectorB, limit = 5) {
  if (!vectorA || !vectorB) return [];

  const common = [];

  for (const [token, valueA] of vectorA.entries()) {
    if (vectorB.has(token)) {
      common.push({
        token,
        score: valueA + vectorB.get(token),
      });
    }
  }

  return common
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.token);
}

function calculateLyricsSimilarity(vectorA, vectorB) {
  const score = cosineSimilaritySparse(vectorA, vectorB);
  const common_terms = getCommonTopLyricsTerms(vectorA, vectorB);

  return {
    score: Math.round(score * 10000) / 10000,
    detail: {
      lyrics_similarity: Math.round(score * 10000) / 10000,
      common_lyrics_terms: common_terms,
    },
  };
}

module.exports = {
  tokenizeLyrics,
  buildLyricsTfIdfVectorMap,
  calculateLyricsSimilarity,
};
