import http from "@/app/lib/http";

export const rateSong = async (songId: number, score: number) => {
  const res = await http.post("/ratings/rate", {
    songId,
    score,
  });

  return res.data;
};

export const getSongRatingSummary = async (songId: number) => {
  const res = await http.get(`/ratings/song/${songId}/summary`);
  return res.data;
};

export const getMyRating = async (songId: number) => {
  const res = await http.get(`/ratings/song/${songId}/my-rating`);
  return res.data;
};
