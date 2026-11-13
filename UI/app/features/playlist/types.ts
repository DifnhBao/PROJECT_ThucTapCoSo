export interface PlaylistSong {
  songId: number;
  title: string;
  imageUrl?: string;
  audioUrl: string;
  duration: number;
  viewCount: number;
  artistName?: string;
}

export interface Playlist {
  playlistId: number;
  userId: number;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;

  songs?: PlaylistSong[];
}
