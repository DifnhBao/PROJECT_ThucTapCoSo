import { useEffect, useState } from "react";
import { fetchArtists, fetchArtistDetail } from "@/app/utils/artistApi";
import type { Artist } from "@/app/types/music";
import HorizontalScroll from "@/app/components/HorizontalScroll";
import type { SelectedItem } from "@/app/types/music";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const ArtistSection: React.FC<Props> = ({ onSelect }) => {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    fetchArtists().then(setArtists).catch(console.error);
  }, []);

  const handleSelect = async (artist: Artist) => {
    const detail = await fetchArtistDetail(artist.id);
    onSelect(detail);
  };

  return (
    <HorizontalScroll>
      <section>
        <div className="scroll-row">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="card card_artist"
              onClick={() => handleSelect(artist)}
            >
              <img src={artist.image} alt={artist.name} />
              <h3>{artist.name}</h3>
            </div>
          ))}
        </div>
      </section>
    </HorizontalScroll>
  );
};

export default ArtistSection;
