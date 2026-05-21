import type { Track } from "@/app/types/music";

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
    artists?: { name: string }[];
    genres?: string[];
  };

  // Flat shape (trường hợp response flat)
  song_id?: number;
  id?: number;
  title?: string;
  image_url?: string;
  audio_url?: string;
  duration?: number;
  artists?: { name: string }[];
  genres?: string[];

  // Scores
  final_score?: number;
  metadata_score?: number;
  behavioral_score?: number;
  accumulated_score?: number; // Cho endpoint ForUser

  // Reason
  reason?: string;
  detail?: string;
}

/** RecommendationSong = Track + thông tin điểm số / lý do */
export interface RecommendationSong extends Track {
  finalScore?: number;
  metadataScore?: number;
  behavioralScore?: number;
  reason?: string;
  detail?: string;
}

/** Shape từ debug endpoint */
export interface SongPairDebug {
  songA: RawRecommendationSong;
  songB: RawRecommendationSong;
  final_score: number;
  metadata_score: number;
  behavioral_score: number;
  detail?: string;
}
