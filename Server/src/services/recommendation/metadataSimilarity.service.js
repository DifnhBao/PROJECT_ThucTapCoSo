const { Song, Genre, Artist } = require("../../models");
const { calculateLyricsSimilarity } = require("./lyricsSimilarity.service");

/* =========================================================
   PHẦN 1: HÀM TIỆN ÍCH (Utility Functions)
   ========================================================= */

/**
 * Jaccard Similarity — đo độ tương đồng giữa 2 tập hợp.
 * Score = |giao| / |hợp|
 * Trả về 0 nếu cả 2 mảng đều rỗng.
 *
 * @param {string[]} arrA
 * @param {string[]} arrB
 * @returns {number} score trong khoảng [0, 1]
 */

function normalizeTextValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map(normalizeTextValue).filter(Boolean))];
}

function normalizeJsonArrayLike(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return uniqueNonEmpty(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return uniqueNonEmpty(parsed);
      if (parsed && typeof parsed === "object") {
        return uniqueNonEmpty(Object.values(parsed).flat());
      }
    } catch (_) {
      return uniqueNonEmpty([value]);
    }
  }

  if (value && typeof value === "object") {
    return uniqueNonEmpty(Object.values(value).flat());
  }

  return [];
}

/**
 * Normalize mood linh hoạt vì dữ liệu DB có thể là:
 * - ["sad", "romantic"]
 * - { primary: "sad", secondary: ["romantic"], energy: "low", valence: "negative" }
 * - "sad"
 */
function normalizeMood(mood) {
  if (!mood) return [];

  if (Array.isArray(mood)) {
    return uniqueNonEmpty(mood);
  }

  if (typeof mood === "string") {
    try {
      return normalizeMood(JSON.parse(mood));
    } catch (_) {
      return uniqueNonEmpty([mood]);
    }
  }

  if (mood && typeof mood === "object") {
    const values = [];

    if (mood.primary) values.push(mood.primary);
    if (Array.isArray(mood.secondary)) values.push(...mood.secondary);
    if (mood.energy) values.push(mood.energy);
    if (mood.valence) values.push(mood.valence);

    return uniqueNonEmpty(values);
  }

  return [];
}

function jaccardSimilarity(arrA, arrB) {
  const setA = new Set(arrA);
  const setB = new Set(arrB);

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Duration Similarity — đo mức độ gần nhau về thời lượng.
 * score = 1 - |a - b| / max(a, b), clamp về [0, 1].
 * Trả về 0 nếu thiếu hoặc không hợp lệ.
 *
 * @param {number|null|undefined} durationA  (giây)
 * @param {number|null|undefined} durationB  (giây)
 * @returns {number} score trong khoảng [0, 1]
 */
function durationSimilarity(durationA, durationB) {
  if (!durationA || !durationB || durationA <= 0 || durationB <= 0) return 0;

  const score =
    1 - Math.abs(durationA - durationB) / Math.max(durationA, durationB);

  // Clamp về [0, 1] để tránh lỗi số học không mong muốn
  return Math.min(1, Math.max(0, score));
}

/* =========================================================
   PHẦN 2: LẤY DỮ LIỆU BÀI HÁT (Data Fetching)
   ========================================================= */

/**
 * Lấy toàn bộ metadata của một bài hát cần dùng để tính điểm tương đồng.
 * Bao gồm: genres, artists, mood (JSON), keywords (JSON), duration.
 *
 * @param {number} songId
 * @returns {Object} metadata object
 * @throws {Error} Nếu bài hát không tồn tại hoặc đã bị ẩn
 */
async function getSongMetadata(songId) {
  const song = await Song.findByPk(songId, {
    attributes: ["song_id", "title", "duration", "mood", "keywords", "lyrics"],
    include: [
      {
        model: Genre,
        as: "genres",
        attributes: ["genre_id", "name"],
        through: { attributes: [] },
      },
      {
        model: Artist,
        as: "artists",
        attributes: ["artist_id", "name"],
        through: { attributes: [] },
      },
    ],
  });

  if (!song) {
    throw new Error(`Song không tồn tại: song_id = ${songId}`);
  }

  // Chuẩn hóa: đảm bảo các trường JSON luôn là Array kể cả khi DB trả về null
  return {
    song_id: song.song_id,
    title: song.title,
    duration: song.duration || 0,
    genres: uniqueNonEmpty((song.genres || []).map((g) => g.name)),
    artists: uniqueNonEmpty((song.artists || []).map((a) => a.name)),
    moods: normalizeMood(song.mood),
    keywords: normalizeJsonArrayLike(song.keywords),
    lyrics: song.lyrics || "",
  };
}

/* =========================================================
   PHẦN 3: TÍNH ĐIỂM TƯƠNG ĐỒNG (Similarity Calculation)
   ========================================================= */

/**
 * Tính điểm tương đồng Content-Based giữa 2 bài hát dựa trên metadata.
 *
 * Công thức Hybrid weighted sum:
 * metadata_score =
 *   0.25 * genre_similarity
 * + 0.20 * mood_similarity
 * + 0.15 * artist_similarity
 * + 0.10 * keyword_similarity
 * + 0.25 * lyrics_similarity
 * + 0.05 * duration_similarity
 *
 * @param {Object} songA  — kết quả từ getSongMetadata()
 * @param {Object} songB  — kết quả từ getSongMetadata()
 * @returns {{ score: number, detail: Object }}
 */
function calculateMetadataSimilarity(songA, songB) {
  // Tính điểm từng thành phần
  const genre_similarity = jaccardSimilarity(songA.genres, songB.genres);
  const mood_similarity = jaccardSimilarity(songA.moods, songB.moods);
  const artist_similarity = jaccardSimilarity(songA.artists, songB.artists);
  const keyword_similarity = jaccardSimilarity(songA.keywords, songB.keywords);
  const dur_similarity = durationSimilarity(songA.duration, songB.duration);
  const { score: lyrics_similarity, detail: lyricsDetail } =
    calculateLyricsSimilarity(songA.lyricsVector, songB.lyricsVector);

  // Điểm tổng hợp theo trọng số
  const score =
    0.25 * genre_similarity +
    0.2 * mood_similarity +
    0.15 * artist_similarity +
    0.1 * keyword_similarity +
    0.25 * lyrics_similarity +
    0.05 * dur_similarity;

  // Tập giao (để lưu vào cột `reason` / `detail`)
  const common_genres = songA.genres.filter((g) => songB.genres.includes(g));
  const common_artists = songA.artists.filter((a) => songB.artists.includes(a));
  const common_moods = songA.moods.filter((m) => songB.moods.includes(m));
  const common_keywords = songA.keywords.filter((k) =>
    songB.keywords.includes(k),
  );

  return {
    score: Math.round(score * 10000) / 10000, // Làm tròn 4 chữ số thập phân
    detail: {
      genre_similarity: Math.round(genre_similarity * 10000) / 10000,
      mood_similarity: Math.round(mood_similarity * 10000) / 10000,
      artist_similarity: Math.round(artist_similarity * 10000) / 10000,
      keyword_similarity: Math.round(keyword_similarity * 10000) / 10000,
      lyrics_similarity: Math.round(lyrics_similarity * 10000) / 10000,
      duration_similarity: Math.round(dur_similarity * 10000) / 10000,
      common_genres,
      common_artists,
      common_moods,
      common_keywords,
      common_lyrics_terms: lyricsDetail.common_lyrics_terms,
    },
  };
}

module.exports = {
  jaccardSimilarity,
  durationSimilarity,
  normalizeMood,
  normalizeJsonArrayLike,
  getSongMetadata,
  calculateMetadataSimilarity,
};
