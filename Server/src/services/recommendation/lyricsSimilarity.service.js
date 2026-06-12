const VIETNAMESE_STOPWORDS = new Set([
  "anh",
  "em",
  "ta",
  "tôi",
  "mình",
  "người",
  "là",
  "và",
  "của",
  "cho",
  "với",
  "trong",
  "không",
  "có",
  "đã",
  "sẽ",
  "một",
  "những",
  "này",
  "kia",
  "đó",
  "thì",
  "mà",
  "ơi",
]);

function normalizeLyrics(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLyrics(text) {
  const words = normalizeLyrics(text)
    .split(" ")
    .filter((w) => w.length >= 2 && !VIETNAMESE_STOPWORDS.has(w));

  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  return [...words, ...bigrams];
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

  for (const [token, valueA] of vectorA.entries()) {
    normA += valueA * valueA;
    if (vectorB.has(token)) {
      dot += valueA * vectorB.get(token);
    }
  }

  for (const valueB of vectorB.values()) {
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
