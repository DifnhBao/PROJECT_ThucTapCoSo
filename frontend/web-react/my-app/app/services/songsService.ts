import axiosClient from "@/app/utils/axiosClient";

export async function fetchSongs() {
  const res = await axiosClient.get("/songs/list");

  return res.data.map((song: any) => ({
    id: song.id,
    jamendo_id: song.jamendo_id,
    title: song.title,
    artist: song.artist_name,
    image: song.image_url,
    audio: song.audio_url,
    duration: song.duration,
  }));
}

export async function fetchDailySongs() {
  const res = await axiosClient.get("songs/daily-song");
  return res.data.map((song: any) => ({
    id: song.id,
    jamendo_id: song.jamendo_id,
    title: song.title,
    artist: song.artist_name,
    image: song.image_url,
    audio: song.audio_url,
    duration: song.duration,
  }));
}

export async function importSongs() {
  const res = await axiosClient.post("/songs/import");
  return res.data;
}

export async function deleteSong(id: number) {
  await axiosClient.delete(`/songs/remove/${id}`);
}
