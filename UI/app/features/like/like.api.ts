import http from "@/app/lib/http";

export const toggleLikeSong = async (songId: number) => {
  const res = await http.post<{ liked: boolean; song_id: number }>(`/favorites/${songId}/like`);
  return res.data;
};

export const getLikeStatus = async (songId: number) => {
  const res = await http.get<{ liked: boolean; song_id: number }>(`/favorites/${songId}/like-status`);
  return res.data;
};
