import http from "@/app/lib/http";
import type { PlaylistDto } from '../../types/api';

export const createPlaylistApi = async (name: string, description?: string) => {
  const response = await http.post<{ data: PlaylistDto; message?: string }>("/playlists", {
    name,
    description,
  });

  return response.data;
};

export const getMyPlaylistsApi = async () => {
  const response = await http.get<{ data: PlaylistDto[] }>("/playlists/me");

  return response.data;
};

export const getPlaylistDetailApi = async (playlistId: number) => {
  const response = await http.get<{ data: PlaylistDto }>(`/playlists/${playlistId}`);

  return response.data;
};

export const addSongToPlaylistApi = async (
  playlistId: number,
  songId: number,
) => {
  const response = await http.post(`/playlists/${playlistId}/songs`, {
    songId,
  });

  return response.data;
};

export const removeSongFromPlaylistApi = async (
  playlistId: number,
  songId: number,
) => {
  const response = await http.delete(
    `/playlists/${playlistId}/songs/${songId}`,
  );

  return response.data;
};

export const deletePlaylistApi = async (playlistId: number) => {
  const response = await http.delete(`/playlists/${playlistId}`);
  return response.data;
};
