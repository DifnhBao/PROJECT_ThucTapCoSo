"use client";

import { useState } from "react";
import "@/app/styles/feature-playlists.css";
import { useUser } from "@/app/features/user/context/UserContext";
import TrackSection from "./TrackSection";
import ArtistSection from "../../features/artist/components/ArtistSection";
import { SelectedItem } from "@/app/types/music";
import RecommendationSection from "@/app/features/recommendation/components/RecommendationSection";
import SimilarSongsSection from "@/app/features/recommendation/components/SimilarSongsSection";
import { usePlayer } from "@/app/features/player/context/PlayerContext";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const FeaturedPlaylists: React.FC<Props> = ({ onSelect }) => {
  const { user, loading } = useUser();
  const { currentTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState("tracks");
  const currentTrackIds = currentTrack as unknown as {
    song_id?: number;
    id?: number;
  } | null;
  const currentSongId =
    Number(
      currentTrackIds?.song_id ?? currentTrackIds?.id ?? currentTrack?.trackId,
    ) || 0;
  const userId =
    Number(
      user?.userId ?? (user as unknown as { user_id?: number } | null)?.user_id,
    ) || 0;

  return (
    <div className="explore-container">
      <div className="make-for">
        <SimilarSongsSection songId={currentSongId} limit={9} />

        {/* ── Recommendation section (real data) ── */}
        {!loading && userId ? (
          <RecommendationSection userId={userId} limit={10} />
        ) : (
          <div className="make-for-header">
            <h2 className="title">Đề xuất cho bạn</h2>
          </div>
        )}
      </div>

      {/* TAB */}
      <div className="explore-tabs">
        <div className="tabs">
          <button
            className={activeTab === "tracks" ? "active" : ""}
            onClick={() => setActiveTab("tracks")}
          >
            Mới cập nhật
          </button>

          <button
            className={activeTab === "playlist" ? "active" : ""}
            onClick={() => setActiveTab("playlist")}
          >
            Daily Mix
          </button>

          <button
            className={activeTab === "artist" ? "active" : ""}
            onClick={() => setActiveTab("artist")}
          >
            Top Artists
          </button>
        </div>

        {/* CONTENT */}
        <div className="tab-content">
          <div style={{ display: activeTab === "tracks" ? "block" : "none" }}>
            <TrackSection />
          </div>
          {/* <div style={{ display: activeTab === "playlist" ? "block" : "none" }}>
            <PlaylistSection onSelect={onSelect} />
          </div> */}
          <div style={{ display: activeTab === "artist" ? "block" : "none" }}>
            <ArtistSection onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedPlaylists;
