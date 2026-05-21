import http from "@/app/lib/axios";

export const toggleLikeSong = async (songId: number) => {
  const res = await http.post(`/favorites/${songId}/like`);
  return res.data;
};

export const getLikeStatus = async (songId: number) => {
  const res = await http.get(`/favorites/${songId}/like-status`);
  return res.data;
};
