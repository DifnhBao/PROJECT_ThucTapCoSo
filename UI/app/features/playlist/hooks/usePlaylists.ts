"use client";

import { useEffect, useState } from "react";
import { Playlist } from "../types";
import { getMyPlaylistsService } from "../service";
import { mapToPlaylist } from "../playlist.mapper";

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getMyPlaylistsService();
      
      const rawData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const playlistData: Playlist[] = rawData.map(mapToPlaylist);

      setPlaylists(playlistData);
    } catch (error: any) {
      const errorMsg = error?.message || "Lỗi khi tải playlists";
      setError(errorMsg);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return { playlists, loading, error, fetchPlaylists };
}
