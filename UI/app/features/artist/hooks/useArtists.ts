import { useState, useEffect } from "react";
import { artistService } from "../artistService";
import type { SelectedItem } from "@/app/types/music";
import type {Artist} from "../types/artist.types"

export const useArtists = (onSelect: (item: SelectedItem) => void) => {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    artistService.getTopArtists(20)
      .then(setArtists)
      .catch(console.error);
  }, []);

  const handleSelect = async (artist: Artist) => {
    try {
      const detail = await artistService.getArtistDetail(artist.artistId);
      onSelect(detail);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    artists,
    handleSelect,
  };
};
