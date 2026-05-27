import {
  createPlaylistApi,
  getMyPlaylistsApi,
  getPlaylistDetailApi,
  addSongToPlaylistApi,
  removeSongFromPlaylistApi,
  deletePlaylistApi,
} from "./api";

export const createPlaylistService = async (
  name: string,
  description?: string,
) => {
  return await createPlaylistApi(name, description);
};

export const getMyPlaylistsService = async () => {
  return await getMyPlaylistsApi();
};

export const getPlaylistDetailService = async (playlistId: number) => {
  return await getPlaylistDetailApi(playlistId);
};

export const addSongToPlaylistService = async (
  playlistId: number,
  songId: number,
) => {
  return await addSongToPlaylistApi(playlistId, songId);
};

export const removeSongFromPlaylistService = async (
  playlistId: number,
  songId: number,
) => {
  return await removeSongFromPlaylistApi(playlistId, songId);
};

export const deletePlaylistService = async (playlistId: number) => {
  return await deletePlaylistApi(playlistId);
};
