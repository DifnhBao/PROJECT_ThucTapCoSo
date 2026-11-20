import http from "@/app/lib/http";
import type { SongDto } from '../../types/api';

export type FavoriteSong = SongDto;
export type FavoritePage = { data: { song: FavoriteSong }[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
export const getMyFavoriteSongs = async (page = 1, limit = 10) => {
  const res = await http.get<FavoritePage>(`/favorites/me`, {
    params: { page, limit },
  });
  return res.data;
};
