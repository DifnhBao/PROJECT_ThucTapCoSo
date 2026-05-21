import http from "@/app/lib/axios";

export const getMyFavoriteSongs = async (page = 1, limit = 10) => {
  const res = await http.get(`/favorites/me`, {
    params: { page, limit },
  });
  return res.data;
};
