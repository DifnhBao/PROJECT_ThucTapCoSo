import { Track } from "../../types/music";
import { adminFetch, userFetch } from "../../utils/refreshToken";
import { mapSongToTrack } from "@/app/utils/song.mapper";

export const URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api";

type PaginatedSongs = {
  page: number;
  limit: number;
  total: number;
  songs: Track[];
};

export async function fetchDailySongs(
  limit = 20,
  page = 1,
): Promise<PaginatedSongs> {
  const res = await fetch(`${URL}/songs?page=${page}&limit=${limit}`);

  if (!res.ok) {
    throw new Error("Failed to fetch songs");
  }

  const data = await res.json();

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

  return res.json();
}

export async function updateSong(id: number, data: any) {
  const res = await adminFetch(`${URL}/songs/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Update failed");

  return res.json();
}

export async function deleteSong(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Delete song failed");
  }

  return json;
}

// like/unlike song
export async function likeSong(songId: number) {
  const res = await userFetch(`${URL}/songs/${songId}/like`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Like failed");
  return res.json();
}

export async function unlikeSong(songId: number) {
  const res = await userFetch(`${URL}/songs/${songId}/like`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Unlike failed");
  return res.json();
}

export async function getLikeStatus(songId: number) {
  const res = await userFetch(`${URL}/songs/${songId}/like-status`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Fetch like status failed");
  return res.json();
}

export async function fetchLikedSongs() {
  const res = await userFetch(`${URL}/songs/me/favorites`, {
    method: "GET",
    credentials: "include",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Fetch liked songs failed");
  }

  return json.data;
}

// ẩn hiện bài hát
export async function toggleSongVisibility(songId: number) {
  const res = await userFetch(`${URL}/songs/${songId}/toggle-invisibility`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Toggle visibility failed");
  }

  return json;
}

// tăng view
export async function increaseSongView(songId: number) {
  await userFetch(`${URL}/songs/${songId}/view`, {
    method: "POST",
    credentials: "include",
  });
}

// tìm kiếm
export async function searchSongs(
  keyword: string,
  limit = 10,
): Promise<Track[]> {
  const res = await fetch(
    `${URL}/songs/search?q=${encodeURIComponent(keyword)}&limit=${limit}`,
    {
      credentials: "include",
    },
  );

  if (!res.ok) {
    throw new Error("Search failed");
  }

  const json = await res.json();

  if (!json.data || !Array.isArray(json.data)) {
    return [];
  }

  return json.data.map(
    (song: any): Track => ({
      trackId: song.song_id,
      title: song.title,
      duration: song.duration || 0,
      imageUrl: song.image_url,
      artistName:
        song.artists?.length > 0
          ? song.artists.map((a: any) => a.name).join(", ")
          : "Unknown",
      audioUrl: song.audio_url,
      genre: song.genre ?? "Other",
      viewCount: 0,
      isVisible:
        song.isVisible !== undefined
          ? song.isVisible
          : song.is_visible !== undefined
            ? song.is_visible
            : true,
    }),
  );
}

export async function createSong(formData: FormData) {
  const res = await adminFetch(`${URL}/songs`, {
    method: "POST",
    credentials: "include",
    body: formData, //
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Create song failed");
  }

  return res.json();
}

export async function uploadSongByUser(formData: FormData) {
  const res = await userFetch(`${URL}/songs/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Upload bài hát thất bại");
  }

  return json;
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
  return res.json();
}

export async function fetchPendingSongsCount() {
  const res = await adminFetch(`${URL}/songs/pending/count`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) return 0;
  const json = await res.json();
  return json.count || 0;
}

export async function approveSongApi(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}/approve`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Duyệt bài hát thất bại");
  return json;
}

export async function rejectSongApi(songId: number) {
  const res = await adminFetch(`${URL}/songs/${songId}/reject`, {
    method: "PATCH",
    credentials: "include",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Từ chối bài hát thất bại");
  return json;
}
