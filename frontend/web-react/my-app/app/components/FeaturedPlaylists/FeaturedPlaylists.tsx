"use client";

import "@/app/styles/feature-playlists.css";
import "@/app/styles/library.css";
import { useUser } from "@/app/context/UserContext";

import DetailView from "./DetailView";
import TrackSection from "./TrackSection";
import PlaylistSection from "./PlaylistSection";
import ArtistSection from "./ArtistSection";
import MyPlaylistGrid from "../MusicContainer/MyPlaylistGrid";
import { SelectedItem } from "@/app/types/music";

import { RiResetRightLine } from "react-icons/ri";

interface Props {
  onSelect: (item: SelectedItem) => void;
}

const FeaturedPlaylists: React.FC<Props> = ({ onSelect }) => {
  const { user } = useUser();

  return (
    <div className="explore-container">
      <div className="make-for">
        <h2 className="title">Đề xuất cho {user ? user.username : "Guest"}</h2>
        <button id="refresh-recommendList">
          <RiResetRightLine /> Làm mới{" "}
        </button>
      </div>

      <h2 className="title">Mới cập nhật</h2>
      <TrackSection />

      <h2 className="title">Daily Mix</h2>
      <PlaylistSection onSelect={onSelect} />

      <h2 className="title">Top Artists</h2>
      <ArtistSection onSelect={onSelect} />
    </div>
  );
};

export default FeaturedPlaylists;
