import "./ArtistSection.css"
import type { SelectedItem } from "@/app/types/music";
import { useArtists } from "../hooks/useArtists";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const ArtistSection: React.FC<Props> = ({ onSelect }) => {
  const { artists, handleSelect } = useArtists(onSelect);

  return (
    <section className="artist-section">
      <div className="artist-grid">
        {artists.map((artist) => (
          <div
            key={artist.artistId  }
            className="card card_artist"
            onClick={() => handleSelect(artist)}
          >
            <img src={artist.imageUrl} alt={artist.name} />
            <button
                  className="artist-play-btn"
                  onClick={() => handleSelect(artist)}
                >
                  <i className="fa-solid fa-play" />
                </button>
            <h3>{artist.name}</h3>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArtistSection;
