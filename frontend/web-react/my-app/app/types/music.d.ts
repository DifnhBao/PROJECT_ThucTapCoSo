export interface Track {
  trackId: number;
  jamendoId: number;
  title: string;
  duration: number;
  imageUrl: string;
  audioUrl: string;
  artistName: string;
  albumName?: string;
  genre: string;
  viewCount: number;
  isVisible: boolean;
  fetched_at: string;
}

export interface Playlist {
  playlistId: number;
  name: string;
  coverImages: string[];
  tracks: Track[];
}

export interface Artist {
  id: number;
  name: string;
  image: string;
}

export interface DetailViewData {
  type: "playlist" | "artist";
  title: string;
  coverImages: string[];
  tracks: Track[];
}

export type SelectedItem = DetailViewData;

// User
export interface User {
  userId: number;
  username: string;
  email: string;
  role: string;
  activity_status: string;
  
}

export interface UserProfileData {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}
