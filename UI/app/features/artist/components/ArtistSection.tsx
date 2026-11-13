import ResourceState from '@/app/components/ui/ResourceState';
import type { SelectedItem } from "@/app/types/music";
import { useArtists } from "../hooks/useArtists";
import "./ArtistSection.css";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const ArtistSection: React.FC<Props> = ({ onSelect }) => {
  const { artists, handleSelect, error, loading, retry, selecting } = useArtists(onSelect);

  if (error) return <ResourceState error={error} retry={retry} />;
  if (loading) return <ResourceState />;
  if (!artists.length) return <p>Chưa có nghệ sĩ.</p>;
  return (
    <section className="artist-section">
      <div className="artist-grid">
        {artists.map((artist) => (
          <div
            key={artist.artistId  }
            className="card card_artist"
          >
            <img loading="lazy" decoding="async" width={160} height={160} src={artist.imageUrl} alt={artist.name} />
            <button
                  onClick={() => void handleSelect(artist)} disabled={selecting} aria-label={`Mở nghệ sĩ ${artist.name}`} className="artist-play-btn"
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
