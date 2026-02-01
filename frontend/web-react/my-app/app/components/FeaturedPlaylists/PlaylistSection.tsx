import React from "react";
import { useState, useEffect } from "react";

import { fetchDailyMixes, fetchDailyMixDetail } from "@/app/utils/mixApi";
import type { Playlist, SelectedItem } from "@/app/types/music";
import HorizontalScroll from "@/app/components/HorizontalScroll";
import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const PlaylistSection: React.FC<Props> = ({ onSelect }) => {
  const [mixes, setMixes] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyMixes()
      .then(setMixes)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (mix: Playlist) => {
    const detail = await fetchDailyMixDetail(mix.playlistId);
    onSelect(detail);
  };

  if (loading) return <p>...</p>;

  return (
    <HorizontalScroll>
      <section>
        <div className="scroll-row">
          {mixes.map((mix) => (
            <div
              className="card"
              key={mix.playlistId}
              onClick={() => handleSelect(mix)}
            >
              <PlaylistCover images={mix.coverImages ?? []} size={230} />
              {/* <img src={mix.image} alt={mix.name} /> */}
              <h3>{mix.name}</h3>
            </div>
          ))}
        </div>
      </section>
    </HorizontalScroll>
  );
};
export default PlaylistSection;
