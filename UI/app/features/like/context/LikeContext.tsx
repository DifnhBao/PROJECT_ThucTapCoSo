"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { toggleLikeSong, getLikeStatus } from "../like.api";
// import { fetchLikedSongs } from "@/app/utils/songApi";
import { getMyFavoriteSongs } from "../favorite.api";
import { mapSongToTrack } from "@/app/utils/song.mapper";

import type { Track } from "@/app/types/music";

const LikeContext = createContext<any>(null);

export const LikeProvider = ({ children }: any) => {
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likedSongsList, setLikedSongsList] = useState<Track[]>([]);

  const fetchLikeStatus = async (songId: number) => {
    if (likedMap[songId] !== undefined) return;

    const res = await getLikeStatus(songId);

    setLikedMap((prev) => ({
      ...prev,
      [songId]: res.liked,
    }));
  };

  const toggleLike = async (songId: number) => {
    const prevLiked = likedMap[songId];

    setLikedMap((prev) => ({
      ...prev,
      [songId]: !prevLiked,
    }));

    try {
      await toggleLikeSong(songId);

      if (prevLiked) {
        // unlike → remove khỏi list
        setLikedSongsList((prev) =>
          prev.filter((song) => song.trackId !== songId),
        );
      } else {
        // like → fetch lại list
        fetchLikedSongsList();
      }
    } catch (err) {
      // rollback nếu fail
      setLikedMap((prev) => ({
        ...prev,
        [songId]: prevLiked,
      }));
    }
  };

  // Lấy danh sách bài hát đã like
  const fetchLikedSongsList = useCallback(async () => {
    try {
      const res = await getMyFavoriteSongs(1, 20);

      // map từ backend raw → Track
      const songs: Track[] = res.data.map((fav: any) =>
        mapSongToTrack(fav.song),
      );

      setLikedSongsList(songs);

      // sync lại map
      const newMap: Record<number, boolean> = {};
      songs.forEach((song) => {
        newMap[song.trackId] = true;
      });

      setLikedMap(newMap);
    } catch (err) {
      console.error("fetchLikedSongsList error:", err);
    }
  }, []);

  return (
    <LikeContext.Provider
      value={{
        likedMap,
        likedSongsList,
        fetchLikeStatus,
        fetchLikedSongsList,
        toggleLike,
      }}
    >
      {children}
    </LikeContext.Provider>
  );
};

export const useLikeContext = () => useContext(LikeContext);
