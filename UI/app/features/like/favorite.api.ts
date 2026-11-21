import http from "@/app/lib/http";
import type { SongDto } from '../../types/api';

export type FavoriteSong = SongDto;
export type FavoritePage = { data: { song: FavoriteSong }[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
export const addFavoriteBatch = async (songIds: number[]) => {
  const res = await http.post<{ songIds: number[]; count: number }>("/favorites/batch", { songIds });
  return res.data;
};

export const getMyFavoriteSongs = async (page = 1, limit = 10) => {
  const res = await http.get<FavoritePage>(`/favorites/me`, {
    params: { page, limit },
  });
  return res.data;
};
