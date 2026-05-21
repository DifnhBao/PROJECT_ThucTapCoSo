import type { Track } from "@/app/types/music";

// utils/mappers/song.mapper.ts
export const mapSongToTrack = (song: any): Track => ({
  trackId: song.song_id,
  title: song.title,
  duration: song.duration,
  audioUrl: song.audio_url,
  imageUrl: song.image_url,
  artistName:
    song.artists && song.artists.length > 0
      ? song.artists.map((a: any) => a.name).join(", ")
      : "Unknown Artist",
  genre: "Update later",
  viewCount: song.view_count ?? 0,
  isVisible: song.is_visible ?? true,
});
