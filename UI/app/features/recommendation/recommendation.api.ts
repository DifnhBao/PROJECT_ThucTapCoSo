import http from "@/app/lib/http";
import type {
  RawRecommendationSong,
  SongPairDebug,
} from "./recommendation.types";
import { mapRawToRecommendationSong } from "./recommendation.mapper";
import type { RecommendationSong } from "./recommendation.types";

interface RecommendationApiEnvelope {
  data?: RawRecommendationSong[];
  recommendations?: RawRecommendationSong[];
  similar?: RawRecommendationSong[];
  items?: RawRecommendationSong[];
}

interface SongPairDebugEnvelope {
  success: boolean;
  message?: string;
  data: SongPairDebug;
}

function extractRecommendationItems(payload: unknown): RawRecommendationSong[] {
  if (Array.isArray(payload)) return payload as RawRecommendationSong[];

  if (!payload || typeof payload !== "object") return [];

  const body = payload as RecommendationApiEnvelope;
  return body.data || body.recommendations || body.similar || body.items || [];
}

/**
 * GET /api/recommendations/users/:userId?limit=10
 * Trả về danh sách bài hát đề xuất cho user.
 */
export async function getRecommendationsForUser(
  userId: number,
  limit = 10,
): Promise<RecommendationSong[]> {
  const endpoint = `/recommendations/users/${userId}?limit=${limit}`;
  const res = await http.get<unknown>(endpoint);
  
  const raw = extractRecommendationItems(res.data);
  
  return raw.map(mapRawToRecommendationSong);
}

/**
 * GET /api/recommendations/songs/:songId/similar?limit=10
 * Trả về danh sách bài hát tương tự.
 */
export async function getSimilarSongs(
  songId: number,
  limit = 10,
): Promise<RecommendationSong[]> {
  const res = await http.get<unknown>(
    `/recommendations/songs/${songId}/similar?limit=${limit}`,
  );
  
  const raw = extractRecommendationItems(res.data);
  
  return raw.map(mapRawToRecommendationSong);
}

/**
 * GET /api/recommendations/debug/song-pair?songA=1&songB=2
 * Debug endpoint: xem điểm tương đồng giữa 2 bài hát.
 */
export async function getSongPairDebug(
  songA: number,
  songB: number,
): Promise<SongPairDebug> {
  const res = await http.get<SongPairDebugEnvelope>(
    `/recommendations/debug/song-pair?songA=${songA}&songB=${songB}`,
  );
  return res.data.data;
}
