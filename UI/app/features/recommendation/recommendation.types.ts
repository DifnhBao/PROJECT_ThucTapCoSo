import type { Track } from "@/app/types/music";

type RawGenre = string | { name: string } | { genre_id: number; name: string };
type RawArtist =
  | string
  | { name: string }
  | { artist_id: number; name: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecommendationDetail = Record<string, any>;

/** Raw shape trả về từ backend recommendation API */
export interface RawRecommendationSong {
  // Nested shape (trường hợp response có key 'song')
  song?: {
    song_id?: number;
    id?: number;
    title?: string;
    image_url?: string;
    audio_url?: string;
    duration?: number;
    artists?: RawArtist | RawArtist[];
    genres?: RawGenre | RawGenre[];
  };

  // Flat shape (trường hợp response flat)
  song_id?: number;
  id?: number;
  title?: string;
  image_url?: string;
  audio_url?: string;
  duration?: number;
  artists?: RawArtist | RawArtist[];
  genres?: RawGenre | RawGenre[];

  // Scores
  final_score?: number;
  metadata_score?: number;
  behavioral_score?: number;
  accumulated_score?: number | null; // Cho endpoint ForUser

  // Reason
  reason?: string;
  detail?: RecommendationDetail;
}

/** RecommendationSong = Track + thông tin điểm số / lý do */
export interface RecommendationSong extends Track {
  finalScore?: number;
  metadataScore?: number;
  behavioralScore?: number;
  reason?: string;
  detail?: RecommendationDetail;
}

/** Shape từ debug endpoint */
export interface SongPairDebug {
  source?: "cache" | "realtime";
  song_a: RawRecommendationSong;
  song_b: RawRecommendationSong;
  final_score: number;
  metadata_score: number;
  behavioral_score: number;
  reason?: string;
  detail?: RecommendationDetail;
  updated_at?: string | null;
}
