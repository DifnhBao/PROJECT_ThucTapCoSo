import type {
  RawRecommendationSong,
  RecommendationSong,
} from "./recommendation.types";

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

  const trackId = songData.song_id ?? songData.id ?? raw.song_id ?? raw.id ?? 0;

  const artistName =
    songData.artists && songData.artists.length > 0
      ? songData.artists.map((a) => a.name).join(", ")
      : "Unknown Artist";

  return {
    // ----- Track fields (bắt buộc để PlayerContext hoạt động) -----
    trackId,
    title: songData.title ?? raw.title ?? "Unknown",
    duration: songData.duration ?? raw.duration ?? 0,
    imageUrl: songData.image_url ?? raw.image_url ?? "",
    audioUrl: songData.audio_url ?? raw.audio_url ?? "",
    artistName,
    genre: songData.genres?.[0] ?? raw.genres?.[0] ?? "Other",
    viewCount: 0,
    isVisible: true,

    // ----- Recommendation extras -----
    finalScore: raw.final_score ?? raw.accumulated_score ?? 0, // fallback cho ForUser
    metadataScore: raw.metadata_score,
    behavioralScore: raw.behavioral_score,
    reason: raw.reason,
    detail: raw.detail,
  };
}
