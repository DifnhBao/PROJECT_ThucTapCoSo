import http from "@/app/lib/http";

export const fetchArtistsApi = async () => {
  const res = await http.get("/artists");
  return res.data;
};

export const fetchTopArtistsApi = async (limit: number = 20) => {
  const res = await http.get(`/artists/top?limit=${limit}`);
  return res.data;
};

export const fetchArtistDetailApi = async (artistId: number) => {
  const res = await http.get(`/artists/${artistId}`);
  return res.data;
};
