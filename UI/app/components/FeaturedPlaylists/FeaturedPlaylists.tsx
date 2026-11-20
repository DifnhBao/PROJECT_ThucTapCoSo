"use client";
import { usePlayerControls } from "@/app/features/player/context/PlayerContext";
import RecommendationSection from "@/app/features/recommendation/components/RecommendationSection";
import SimilarSongsSection from "@/app/features/recommendation/components/SimilarSongsSection";
import { useUser } from "@/app/features/user/context/UserContext";
import "@/app/styles/feature-playlists.css";
import { SelectedItem } from "@/app/types/music";
import { useState } from "react";
import ArtistSection from "../../features/artist/components/ArtistSection";
import TrackSection from "./TrackSection";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const FeaturedPlaylists: React.FC<Props> = ({ onSelect }) => {
  const { user, loading } = useUser();
  const { currentTrack } = usePlayerControls();
  const [activeTab, setActiveTab] = useState("tracks");
  const currentSongId = currentTrack?.trackId ?? 0;
  const userId = user?.userId ?? 0;

  return (
    <div className="explore-container">
      <SimilarSongsSection songId={currentSongId} limit={12} />
      <div className="make-for">
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

          <div style={{ display: activeTab === "artist" ? "block" : "none" }}>
            <ArtistSection onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedPlaylists;
