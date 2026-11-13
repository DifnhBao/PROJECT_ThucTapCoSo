import type { SongDto } from '../types/api';
import type { Track } from '../types/music';
export const mapSongToTrack = (song: SongDto): Track => ({
  trackId: song.song_id, title: song.title, duration: song.duration ?? 0,
  audioUrl: song.audio_url, imageUrl: song.image_url ?? '/images/default-song.svg',
  artistName: song.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist',
  genre: song.genre ?? 'Other', viewCount: song.view_count ?? 0, isVisible: song.is_visible ?? true,
});
