"use client";
import { createContext, useContext, useState, useEffect } from "react";
import {
  fetchArtists,
  // fetchPopularTracks,
} from "@/app/utils/jamendo";
import type { Track, Playlist, Artist } from "@/app/types/music";

interface MusicDataContextType {
  tracks?: Track[];
  playlists?: Playlist[];
  artists?: Artist[];
  loaded: boolean;
  isLoading: boolean;
  error?: any;
}

const MusicDataContext = createContext<MusicDataContextType | undefined>(
  undefined
);

export function MusicDataProvider({ children }: { children: React.ReactNode }) {
  // const [tracks, setTracks] = useState<Track[]>();
  const [playlists, setPlaylists] = useState<Playlist[]>();
  const [artists, setArtists] = useState<Artist[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function loadAllData() {
      try {
        setIsLoading(true);

        // const [tracksData, playlistsData, artistsData] = await Promise.all([
        // const [playlistsData] = await Promise.all([
        // fetchPopularTracks(),
        // fetchPlaylists(),
        // fetchArtists(),
        // ]);

        // setTracks(tracksData);
        // setPlaylists(playlistsData);
        // setArtists(artistsData);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  // const loaded = !!(tracks && playlists && artists);
  const loaded = !!(playlists && artists);

  const data: MusicDataContextType = {
    // tracks,
    playlists,
    artists,
    loaded,
    isLoading,
    error,
  };

  return (
    <MusicDataContext.Provider value={data}>
      {children}
    </MusicDataContext.Provider>
  );
}

export function useMusicData(): MusicDataContextType {
  const context = useContext(MusicDataContext);
  if (!context) {
    throw new Error("useMusicData phải được sử dụng trong MusicDataProvider");
  }
  return context;
}
