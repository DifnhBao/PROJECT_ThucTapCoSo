import axiosClient from "@/app/utils/axiosClient";

export async function fetchDailyMixes(
  params = { count: 12, artists: 10, tracks: 2 }
) {
  const res = await axiosClient.get("/mixes/daily-mix", { params });
  return res.data;
}
