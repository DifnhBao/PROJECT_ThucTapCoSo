import { Playlist } from "./types";

export const mapToPlaylist = (rawData: any): Playlist => {
  if (!rawData) return rawData;

  return {
    playlistId: rawData.playlist_id || rawData.playlistId,
    userId: rawData.user_id || rawData.userId,
    name: rawData.name,
    description: rawData.description,
    coverImageUrl: rawData.cover_image_url || rawData.coverImageUrl,
    isPublic: rawData.is_public ?? rawData.isPublic ?? true,
    createdAt: rawData.created_at || rawData.createdAt,
    updatedAt: rawData.updated_at || rawData.updatedAt,
    songs: rawData.songs?.map((song: any) => ({
      songId: song.song_id || song.songId,
      title: song.title,
      imageUrl: song.image_url || song.imageUrl,
      audioUrl: song.audio_url || song.audioUrl,
      duration: song.duration,
      viewCount: song.view_count || song.viewCount || 0,
      artistName: song.artists?.map((a: any) => a.name).join(", ") || song.artist_name || song.artistName || "Unknown"
    })) || [],
  };
};
