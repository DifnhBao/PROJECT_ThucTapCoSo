"use client";
import FeaturedPlaylists from "@/app/components/FeaturedPlaylists/FeaturedPlaylists";
import type { DetailViewData } from "@/app/types/music";
import { useState } from "react";
import "./Home.css";

import DetailView from "@/app/features/playlist/components/DetailView";

export default function ExplorePage() {
  const [selected, setSelected] = useState<DetailViewData | null>(null);

  /* DETAIL VIEW */
  if (selected) {
    return <DetailView data={selected} onBack={() => setSelected(null)} />;
  }

  /* LIST VIEW */
  return (
    <div id="home" className="home-menu">
      {/* <Banner /> */}

      <h1 className="main-title">Discovery</h1>

      <FeaturedPlaylists onSelect={setSelected} />
    </div>
  );
}
