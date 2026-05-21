"use client";

import { useState } from "react";
import "@/app/styles/feature-playlists.css";
import { useUser } from "@/app/features/user/context/UserContext";
import TrackSection from "./TrackSection";
import PlaylistSection from "./PlaylistSection";
import ArtistSection from "../../features/artist/components/ArtistSection";
import { SelectedItem } from "@/app/types/music";
import RecommendationSection from "@/app/features/recommendation/components/RecommendationSection";

import { RiResetRightLine } from "react-icons/ri";
import HorizontalScroll from "../ui/HorizontalScroll";

const mockTracks = [
  {
    id: 1,
    title: "Anh Đã Ổn Hơn",
    artist: "RPT MCK",
    cover: "https://picsum.photos/300?random=1",
  },
  {
    id: 2,
    title: "Waiting For You",
    artist: "MONO",
    cover: "https://picsum.photos/300?random=2",
  },
  {
    id: 3,
    title: "Em Là",
    artist: "Orange",
    cover: "https://picsum.photos/300?random=3",
  },
  {
    id: 4,
    title: "Lạc Trôi",
    artist: "Sơn Tùng",
    cover: "https://picsum.photos/300?random=4",
  },
  {
    id: 5,
    title: "Nàng Thơ",
    artist: "Hoàng Dũng",
    cover: "https://picsum.photos/300?random=5",
  },
  {
    id: 6,
    title: "Chạy Ngay Đi",
    artist: "Sơn Tùng",
    cover: "https://picsum.photos/300?random=6",
  },
];

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const FeaturedPlaylists: React.FC<Props> = ({ onSelect }) => {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState("tracks");

  return (
    <div className="explore-container">
      <div className="make-for">
        {/* ── Recommendation section (real data) ── */}
        {!loading && (user?.userId || (user as any)?.user_id) ? (
          <RecommendationSection userId={user?.userId || (user as any)?.user_id} limit={10} />
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
