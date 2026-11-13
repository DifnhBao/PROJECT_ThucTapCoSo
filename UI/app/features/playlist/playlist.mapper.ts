import type { PlaylistDto } from '../../types/api';
import { mapSongToTrack } from '../../utils/song.mapper';
import type { Playlist } from './types';
export const mapToPlaylist = (raw: PlaylistDto): Playlist => ({
  playlistId: raw.playlist_id, userId: raw.user_id, name: raw.name, description: raw.description,
  coverImageUrl: raw.cover_image_url, isPublic: raw.is_public, createdAt: raw.created_at, updatedAt: raw.updated_at,
  songs: (raw.songs ?? []).map((song) => {
    const track = mapSongToTrack(song);
    return { songId: track.trackId, title: track.title, imageUrl: track.imageUrl, audioUrl: track.audioUrl, duration: track.duration, viewCount: track.viewCount, artistName: track.artistName };
  }),
});
