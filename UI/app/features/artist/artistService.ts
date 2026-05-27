import { fetchArtistsApi, fetchArtistDetailApi, fetchTopArtistsApi } from "./artist.api";
import type { DetailViewData } from "@/app/types/music";
import type {Artist} from "./types/artist.types"

export const artistService = {
  getArtists: async (): Promise<Artist[]> => {
    const json = await fetchArtistsApi();
    
    return json.data.map((a: any) => ({
      artistId: a.artist_id,
      name: a.name,
      imageUrl: a.image_url ?? "/images/default-artist.png",
    }));
  },

  getTopArtists: async (limit: number = 20): Promise<Artist[]> => {
    const json = await fetchTopArtistsApi(limit);
    
    return json.data.map((a: any) => ({
      artistId: a.artist_id,
      name: a.name,
      imageUrl: a.image_url ?? "/images/default-artist.png",
      totalListens: a.total_listens, // dùng sau này
    }));
  },

  getArtistDetail: async (artistId: number): Promise<DetailViewData> => {
    const json = await fetchArtistDetailApi(artistId);
    const artist = json.data;

    const songs = artist.songs ?? [];

    const artistImage =
      artist.image_url ?? songs[0]?.image_url ?? "/images/default-artist.png";

    return {
      type: "artist",
      title: artist.name,
      coverImages: [artistImage],
      tracks: songs.map((s: any) => ({
        trackId: s.song_id,
        title: s.title,
        duration: s.duration,
        imageUrl: s.image_url,
        audioUrl: s.audio_url,
        artistName: artist.name,
      })),
    };
  },
};