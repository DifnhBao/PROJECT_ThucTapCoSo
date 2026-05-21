import http from "@/app/lib/http";
import type {
  RawRecommendationSong,
  SongPairDebug,
} from "./recommendation.types";
import { mapRawToRecommendationSong } from "./recommendation.mapper";
import type { RecommendationSong } from "./recommendation.types";

/**
 * GET /api/recommendations/users/:userId?limit=10
 * Trả về danh sách bài hát đề xuất cho user.
 */
export async function getRecommendationsForUser(
  userId: number,
  limit = 10,
): Promise<RecommendationSong[]> {
  const endpoint = `/recommendations/users/${userId}?limit=${limit}`;
  const res = await http.get(endpoint);
  
  const resData = res.data as any;
  const raw: RawRecommendationSong[] = resData?.data || resData?.recommendations || resData?.items || (Array.isArray(resData) ? resData : []);
  
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
  const res = await http.get(
    `/recommendations/songs/${songId}/similar?limit=${limit}`,
  );
  
  const resData = res.data as any;
  const raw: RawRecommendationSong[] = resData?.data || resData?.similar || resData?.items || (Array.isArray(resData) ? resData : []);
  
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
  const res = await http.get<SongPairDebug>(
    `/recommendations/debug/song-pair?songA=${songA}&songB=${songB}`,
  );
  return res.data;
}
