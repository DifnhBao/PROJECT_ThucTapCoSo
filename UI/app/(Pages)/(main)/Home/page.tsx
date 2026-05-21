"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./Home.css"
import Banner from "@/app/components/ui/Banner";
import FeaturedPlaylists from "@/app/components/FeaturedPlaylists/FeaturedPlaylists";
import type { Playlist, DetailViewData } from "@/app/types/music";

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
