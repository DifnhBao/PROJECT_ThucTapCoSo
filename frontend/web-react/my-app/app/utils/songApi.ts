import { URL } from "./authApi";
import { Track } from "../types/music";
import { adminFetch, userFetch } from "./refreshToken";

export async function fetchDailySongs(limit = 20, page = 1): Promise<Track[]> {
  const res = await fetch(`${URL}/songs?limit=${limit}&page=${page}`);
  if (!res.ok) {
    throw new Error("Failed to fetch songs");
  }

  const data = await res.json();

  if (!data.songs || !Array.isArray(data.songs)) {
    return [];
  }

  return data.songs.map(
    (song: any): Track => ({
      trackId: song.song_id,
      jamendoId: song.jamendo_id,
      title: song.title,
      duration: song.duration,
      imageUrl: song.image_url,
      audioUrl: song.audio_url,
      artistName: song.artist_name ?? song.artists?.name ?? "Unknown Artist",
      albumName: song.album_name ?? null,
      genre: song.genre ?? "Other",
      viewCount: song.view_count ?? 0,
      isVisible: song.is_visible,
      fetched_at: song.fetched_at,
    })
  );
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
  limit = 10
): Promise<Track[]> {
  const res = await fetch(
    `${URL}/songs/search?q=${encodeURIComponent(keyword)}&limit=${limit}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Search failed");
  }

  const json = await res.json();
  return json.data;
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
