// import type { Playlist, Track, Artist } from "@/app/types/music";

// export const JAMENDO_CLIENT_ID = "0ffcdfae";

// //Gọi API có retry ===
// async function fetchWithRetry(url: string, retries = 3) {
//   let attempt = 0;
//   let data = null;

//   while (attempt < retries && !data) {
//     try {
//       const res = await fetch(url);
//       const json = await res.json();
//       if (json.results && json.results.length > 0) {
//         data = json;
//       }
//     } catch (err) {
//       console.warn(`Lỗi khi fetch: ${url}`, err);
//     }
//     attempt++;
//   }

//   return data;
// }

//Lấy bài hát phổ biến
// export async function fetchPopularTracks(limit = 20): Promise<Track[]> {
//   let tracks: Track[] = [];

//   const randomOffset = Math.floor(Math.random() * 100);
//   const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&order=popularity_total_desc&offset=${randomOffset}`;

//   const data = await fetchWithRetry(url);

//   if (data?.results?.length) {
//     tracks = data.results.map(
//       (track: any): Track => ({
//         id: track.id,
//         title: track.name,
//         artist: track.artist_name,
//         image: track.album_image,
//         audio: track.audio,
//       })
//     );
//   }

//   // Nếu vẫn rỗng thì trả fallback
//   if (tracks.length === 0) {
//     console.warn("Không thể lấy tracks, trả về dữ liệu fallback");
//     tracks = [
//       {
//         id: "fallback",
//         title: "No track available",
//         artist: "Unknown artist",
//         image: "/images/default-cover.jpg",
//         audio: "",
//       },
//     ];
//   }

//   return tracks;
// }

// Lấy playlist có kèm danh sách bài hát
// export async function fetchPlaylists(limit = 20): Promise<Playlist[]> {
//   const randomOffset = Math.floor(Math.random() * 80);
//   const url = `https://api.jamendo.com/v3.0/playlists/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&offset=${randomOffset}`;

//   const data = await fetchWithRetry(url);
//   const results = data?.results || [];

//   const playlistsWithTracks = await Promise.all(
//     results.map(async (pl: any): Promise<Playlist> => {
//       let coverImage = pl.image || "/images/default-cover.jpg";
//       let tracks: Track[] = [];

//       try {
//         const tracksUrl = `https://api.jamendo.com/v3.0/playlists/tracks/?client_id=${JAMENDO_CLIENT_ID}&id=${pl.id}&limit=10`;
//         const tracksData = await fetchWithRetry(tracksUrl);
//         const fetchedTracks = tracksData?.results?.[0]?.tracks || [];

//         tracks = fetchedTracks.map(
//           (t: any): Track => ({
//             id: t.id,
//             title: t.name,
//             artist: t.artist_name,
//             image: t.album_image,
//             audio: t.audio,
//           })
//         );

//         if (tracks.length > 0 && tracks[0].image) {
//           coverImage = tracks[0].image;
//         }
//       } catch (e) {
//         console.warn(`Không lấy được bài hát cho playlist "${pl.name}"`);
//       }

//       return {
//         id: pl.id,
//         name: pl.name,
//         description: pl.description || "No description",
//         user: pl.user_name,
//         coverImage,
//         trackCount: tracks.length,
//         tracks,
//       };
//     })
//   );

//   // Giữ lại playlist có ít nhất 1 track
//   const filteredPlaylists = playlistsWithTracks.filter(
//     (pl) => pl.tracks.length > 0
//   );

//   // Fallback nếu rỗng
//   if (filteredPlaylists.length === 0) {
//     return [
//       {
//         id: "fallback",
//         name: "No playlists found",
//         description: "No description",
//         user: "Unknown",
//         coverImage: "/images/default-cover.jpg",
//         trackCount: 0,
//         tracks: [],
//       },
//     ];
//   }

//   return filteredPlaylists;
// }

// Lấy danh sách nghệ sĩ có bài hát
export async function fetchArtists(limit = 10): Promise<Artist[]> {
  const randomOffset = Math.floor(Math.random() * 120);
  const url = `https://api.jamendo.com/v3.0/artists/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&offset=${randomOffset}`;

  const data = await fetchWithRetry(url);
  const results = data?.results || [];

  const artists = await Promise.all(
    results.map(async (artist: any): Promise<Artist> => {
      try {
        const tracksUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&artist_id=${artist.id}&limit=10`;
        const tracksData = await fetchWithRetry(tracksUrl);
        const tracks = (tracksData?.results || []).map(
          (t: any): Track => ({
            id: t.id,
            title: t.name,
            artist: t.artist_name,
            image: t.album_image,
            audio: t.audio,
          })
        );

        const artistImage =
          artist.image ||
          (tracks.length > 0 ? tracks[0].image : "/images/default-artist.jpg");

        return {
          id: artist.id,
          name: artist.name,
          image: artistImage,
          tracks,
        };
      } catch {
        return {
          id: artist.id,
          name: artist.name,
          image: "/images/default-artist.jpg",
          tracks: [],
        };
      }
    })
  );

  const filteredArtists = artists.filter((artist) => artist.tracks.length > 0);

  // Fallback nếu rỗng
  if (filteredArtists.length === 0) {
    return [
      {
        id: "fallback",
        name: "Unknown Artist",
        image: "/images/default-artist.jpg",
        tracks: [],
      },
    ];
  }

  return filteredArtists;
}
