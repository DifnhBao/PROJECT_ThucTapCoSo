import type { Artist, DetailViewData, Track } from "@/app/types/music";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api";

export async function fetchArtists(): Promise<Artist[]> {
  const res = await fetch(`${API_URL}/artists`);
  const json = await res.json();

  return json.data.map((a: any) => ({
    id: a.artist_id,
    name: a.name,
    image: a.image_url ?? "/images/default-artist.png",
  }));
}

export async function fetchArtistDetail(
  artistId: number
): Promise<DetailViewData> {
  const res = await fetch(`${API_URL}/artists/${artistId}`);
  const json = await res.json();
  const artist = json.data;

  const songs = artist.songs ?? [];

  const artistImage =
    artist.image_url ?? songs[0]?.image_url ?? "/images/default-artist.png";

  return {
    type: "artist",
    title: artist.name,
    coverImages: [artistImage],
    tracks: artist.songs.map((s: any) => ({
      trackId: s.song_id,
      title: s.title,
      duration: s.duration,
      imageUrl: s.image_url,
      audioUrl: s.audio_url,
      artistName: artist.name,
    })),
  };
}
