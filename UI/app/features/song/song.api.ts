import { mapSongToTrack } from "@/app/utils/song.mapper";
import { readApiResponse } from "../../lib/api-contract";
import { apiFetch } from '../../lib/api-transport';
import { uploadKey } from '../../lib/upload-key';
import type { SongDto,SongMetadata,SongMutationDto,SongPageDto } from '../../types/api';
import { Track } from "../../types/music";
import { adminFetch,userFetch } from "../../utils/refreshToken";

export const URL =
  "/api";

type PaginatedSongs = {
  page: number;
  limit: number;
  total: number;
  songs: Track[];
};

export async function fetchDailySongs(
  limit = 20,
  page = 1,
  signal?: AbortSignal,
): Promise<PaginatedSongs> {
  const res = await apiFetch(`${URL}/songs?page=${page}&limit=${limit}`, { signal });

  const data = await readApiResponse<{ songs: SongDto[]; page: number; limit: number; total: number }>(res);

  return {
    page: data.page,
    limit: data.limit,
    total: data.total,
    songs: data.songs.map(mapSongToTrack),
  };
}

// lấy tất cả bài hát có phân trang cho trang quản trị
export async function fetchSongsForManage({
  page = 1,
  limit = 10,
  search = "",
}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
  });

  const res = await adminFetch(`${URL}/songs/all?${params}`, {
    method: "GET",
    credentials: "include",
  });

  return readApiResponse<SongPageDto>(res);
}

export async function updateSong(id: number, data: SongMetadata) {
  const res = await adminFetch(`${URL}/songs/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Update failed");

  return readApiResponse<SongMutationDto>(res);
}

export async function deleteSong(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = await readApiResponse<{ message?: string }>(res);

  if (!res.ok) {
    throw new Error(json.message || "Delete song failed");
  }

  return json;
}

export async function toggleSongVisibility(songId: number) {
  const response = await adminFetch(`${URL}/songs/${songId}/toggle-invisibility`, { method: 'PATCH' });
  return readApiResponse<{ isVisible: boolean; message?: string }>(response);
}

// tìm kiếm
export async function searchSongs(
  keyword: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<Track[]> {
  const res = await apiFetch(
    `${URL}/songs/search?q=${encodeURIComponent(keyword)}&limit=${limit}`,
    { signal,
      credentials: "include",
    },
  );

  if (!res.ok) {
    throw new Error("Search failed");
  }

  const json = await readApiResponse<{ data: SongDto[] }>(res);
  return json.data.map(mapSongToTrack);
}

export async function createSong(formData: FormData) {
  const attempt = await uploadKey(formData, 'admin-song');
  const res = await adminFetch(`${URL}/songs`, { method: 'POST', credentials: 'include', headers: { 'Idempotency-Key': attempt.key }, body: formData });
  const result = await readApiResponse<SongMutationDto>(res);
  attempt.done();
  return result;
}
export async function uploadSongByUser(formData: FormData) {
  const attempt = await uploadKey(formData, 'user-song');
  const res = await userFetch(`${URL}/songs/upload`, { method: 'POST', credentials: 'include', headers: { 'Idempotency-Key': attempt.key }, body: formData });
  const result = await readApiResponse<SongMutationDto>(res);
  attempt.done();
  return result;
}

/* --- DUYỆT BÀI HÁT (ADMIN) --- */

export async function fetchPendingSongs({
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const res = await adminFetch(`${URL}/songs/pending?${params}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Fetch pending songs failed");
  return readApiResponse<SongPageDto>(res);
}

export async function fetchPendingSongsCount() {
  const res = await adminFetch(`${URL}/songs/pending/count`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) return 0;
  const json = await readApiResponse<{ count: number }>(res);
  return json.count || 0;
}

export async function approveSongApi(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}/approve`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await readApiResponse<{ message?: string }>(res);
  if (!res.ok) throw new Error(json.message || "Duyệt bài hát thất bại");
  return json;
}

export async function rejectSongApi(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}/reject`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await readApiResponse<{ message?: string }>(res);
  if (!res.ok) throw new Error(json.message || "Từ chối bài hát thất bại");
  return json;
}
