import http from "@/app/lib/http";
import type { ArtistDto } from '../../types/api';

export const fetchArtistsApi = async () => {
  const res = await http.get<{ data: ArtistDto[] }>("/artists");
  return res.data;
};

export const fetchTopArtistsApi = async (limit: number = 20) => {
  const res = await http.get<{ data: ArtistDto[] }>(`/artists/top?limit=${limit}`);
  return res.data;
};

export const fetchArtistDetailApi = async (artistId: number) => {
  const res = await http.get<{ data: ArtistDto }>(`/artists/${artistId}`);
  return res.data;
};
