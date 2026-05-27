"use client";

import { useEffect, useState, useCallback } from "react";
import { Playlist } from "../types";
import { getPlaylistDetailService } from "../service";
import { mapToPlaylist } from "../playlist.mapper";

export function usePlaylistDetail(playlistId?: number | null) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylistDetail = useCallback(async () => {
    if (!playlistId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getPlaylistDetailService(playlistId);
      
      const rawData = response?.data || response;

      const playlistData: Playlist = mapToPlaylist(rawData);

      setPlaylist(playlistData);
    } catch (error: any) {
      const errorMsg = error?.message || "Lỗi khi tải chi tiết playlist";
      setError(errorMsg);
      setPlaylist(null);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylistDetail();
  }, [fetchPlaylistDetail]);

  return { playlist, loading, error, fetchPlaylistDetail };
}
