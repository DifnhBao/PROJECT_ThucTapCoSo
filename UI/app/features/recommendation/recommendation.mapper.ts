import type {
  RawRecommendationSong,
  RecommendationSong,
} from "./recommendation.types";

function normalizeNameList(value: unknown): string[] {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return values
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name?: unknown }).name;
        return typeof name === "string" ? name : "";
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Map raw backend response → RecommendationSong
 * Xử lý cả snake_case lẫn camelCase.
 * Bắt buộc phải map đúng sang Track fields để PlayerContext nhận được.
 */
export function mapRawToRecommendationSong(
  raw: RawRecommendationSong,
): RecommendationSong {
  // Lấy data từ raw.song nếu là nested, hoặc từ raw nếu là flat
  const songData = raw.song || raw;

  const trackId = songData.song_id ?? raw.song_id ?? songData.id ?? raw.id ?? 0;
  const artists = normalizeNameList(songData.artists ?? raw.artists);
  const genres = normalizeNameList(songData.genres ?? raw.genres);

  const artistName = artists.length > 0 ? artists.join(", ") : "Unknown Artist";

  return {
    // ----- Track fields (bắt buộc để PlayerContext hoạt động) -----
    trackId,
    title: songData.title ?? raw.title ?? "Unknown",
    duration: songData.duration ?? raw.duration ?? 0,
    imageUrl: songData.image_url ?? raw.image_url ?? "",
    audioUrl: songData.audio_url ?? raw.audio_url ?? "",
    artistName,
    genre: genres[0] ?? "Other",
    viewCount: 0,
    isVisible: true,

    // ----- Recommendation extras -----
    finalScore: raw.final_score ?? raw.accumulated_score ?? undefined, // fallback cho ForUser
    metadataScore: raw.metadata_score,
    behavioralScore: raw.behavioral_score,
    reason: raw.reason,
    detail: raw.detail,
  };
}
