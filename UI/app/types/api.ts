export interface PaginationDto { page: number; limit: number; total: number; totalPages: number }
export interface NamedDto { name: string }
export interface ArtistDto extends NamedDto { artist_id: number; image_url?: string | null; total_listens?: number; songs?: SongDto[] }
export interface SongDto {
  song_id: number; title: string; duration: number; audio_url: string;
  image_url?: string | null; artists?: NamedDto[]; genres?: NamedDto[];
  genre?: string; view_count?: number; is_visible?: boolean; status?: 'pending' | 'approved' | 'rejected';
  created_at?: string; fetched_at?: string; updated_at?: string; uploader?: { username: string; email?: string };
}
export interface SongMetadata { title: string; artist?: string; genre?: string; duration?: number }
export interface SongPageDto { data: SongDto[]; pagination: PaginationDto }
export interface SongMutationDto { data: SongDto; message?: string }
export interface PlaylistDto {
  playlist_id: number; user_id: number; name: string; description?: string; cover_image_url?: string;
  is_public: boolean; created_at?: string; updated_at?: string; songs?: SongDto[];
}
export interface UserDto {
  user_id: number; username: string; email: string; role: string; activity_status?: string; is_active?: boolean; avatar?: string;
  first_name?: string | null; last_name?: string | null; gender?: string | null; birthday?: string | null; phone_number?: string | null; address?: string | null;
}
export interface MessageDto { message?: string }

export interface LoginDto { message: string; data: { user: UserDto } }
export interface AdminLoginDto { message: string; admin: UserDto }
