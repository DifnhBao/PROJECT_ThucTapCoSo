import type { Playlist, Track, DetailViewData } from "@/app/types/music";

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api";

export async function fetchDailyMixes(): Promise<Playlist[]> {
  const res = await fetch(`${API_URL}/playlists/daily-mixes`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  const json = await res.json();

  return json.data.map((pl: any) => ({
    playlistId: pl.playlist_id,
    name: pl.name,
    coverImages: pl.tracks.map((t: any) => t.image_url).slice(0, 4),
    tracks: [],
  }));
}

export async function fetchDailyMixDetail(
  playlistId: number
): Promise<DetailViewData> {
  const res = await fetch(`${API_URL}/playlists/daily-mix/${playlistId}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  const json = await res.json();
  const pl = json.data;

  return {
    type: "playlist",
    title: pl.name,
    coverImages: pl.Songs.map((s: any) => s.image_url).slice(0, 4),
    tracks: pl.Songs.map((s: any) => ({
      trackId: s.song_id,
      title: s.title,
      duration: s.duration,
      imageUrl: s.image_url,
      audioUrl: s.audio_url,
      artistName: s.artist_name,
      albumName: s.album_name,
    })),
  };
}
