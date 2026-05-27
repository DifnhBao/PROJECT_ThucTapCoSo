// "use client";

// import React, { useState, useEffect } from "react";
// import { fetchDailySongs } from "@/app/features/song/song.api";
// import type { Track } from "@/app/types/music";
// import { usePlayer } from "@/app/features/player/context/PlayerContext";
// import {
//   likeSong,
//   unlikeSong,
//   getLikeStatus,
// } from "@/app/features/song/song.api";
// import { formatDuration } from "@/app/utils/dateHelper";
// import { IoHeartOutline, IoHeart } from "react-icons/io5";
// import { PiMusicNotesDuotone } from "react-icons/pi";
// import { BsPeopleFill } from "react-icons/bs";

// // Mock view counts
// const mockViews = ["120k", "98k", "215k", "87k", "143k", "62k", "310k", "78k"];

// const SongRow = ({
//   song,
//   index,
//   isActive,
//   onPlay,
// }: {
//   song: Track;
//   index: number;
//   isActive: boolean;
//   onPlay: () => void;
// }) => {
//   const [liked, setLiked] = useState(false);

//   useEffect(() => {
//     if (!song.trackId) return;
//     getLikeStatus(song.trackId)
//       .then((res) => setLiked(res.liked))
//       .catch(() => {});
//   }, [song.trackId]);

//   const toggleLike = async (e: React.MouseEvent) => {
//     e.stopPropagation();
//     if (!song.trackId) return;
//     try {
//       if (liked) {
//         await unlikeSong(song.trackId);
//         setLiked(false);
//       } else {
//         await likeSong(song.trackId);
//         setLiked(true);
//       }
//     } catch {}
//   };

//   return (
//     <div
//       className={`song-row${isActive ? " song-row--active" : ""}`}
//       onClick={onPlay}
//     >
//       {/* Song info */}
//       <div className="song-row-info">
//         <div className="song-row-cover">
//           {song.imageUrl ? (
//             <img
//               src={song.imageUrl}
//               alt={song.title}
//               className="song-row-img"
//             />
//           ) : (
//             <div className="song-row-img-placeholder">
//               <PiMusicNotesDuotone />
//             </div>
//           )}
//         </div>
//         <div className="song-row-meta">
//           <span
//             className={`song-row-title${isActive ? " song-row-title--active" : ""}`}
//           >
//             {song.title}
//           </span>
//           <span className="song-row-artist">{song.artistName}</span>
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="song-row-actions">
//         <span className="song-row-views">
//           <PiMusicNotesDuotone className="song-row-views-icon" />
//           {mockViews[index % mockViews.length]}
//         </span>
//         <button className="song-row-icon-btn" title="Contributors">
//           <BsPeopleFill />
//         </button>
//         <button
//           className={`song-row-icon-btn song-row-like-btn${liked ? " song-row-like-btn--liked" : ""}`}
//           onClick={toggleLike}
//           title={liked ? "Unlike" : "Like"}
//         >
//           {liked ? <IoHeart /> : <IoHeartOutline />}
//         </button>
//       </div>
//     </div>
//   );
// };

// const SongListSection: React.FC = () => {
//   const [songs, setSongs] = useState<Track[]>([]);
//   const [loading, setLoading] = useState(false);
//   const { setPlaylist, playlist, currentIndex } = usePlayer();

//   useEffect(() => {
//     setLoading(true);
//     fetchDailySongs(20, 1)
//       .then(setSongs)
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);

//   const handlePlay = (index: number) => {
//     setPlaylist(songs, index);
//   };

//   if (loading && !songs.length) {
//     return (
//       <div className="song-list">
//         {Array.from({ length: 5 }).map((_, i) => (
//           <div key={i} className="song-row song-row--skeleton">
//             <div className="skeleton-cover" />
//             <div className="skeleton-lines">
//               <div className="skeleton-line skeleton-line--title" />
//               <div className="skeleton-line skeleton-line--sub" />
//             </div>
//           </div>
//         ))}
//       </div>
//     );
//   }

//   if (!songs.length) return <p className="no-songs">Chưa có bài hát nào</p>;

//   return (
//     <div className="song-list">
//       {songs.map((song, index) => {
//         const isActive = playlist[currentIndex]?.trackId === song.trackId;
//         return (
//           <SongRow
//             key={song.trackId}
//             song={song}
//             index={index}
//             isActive={isActive}
//             onPlay={() => handlePlay(index)}
//           />
//         );
//       })}
//     </div>
//   );
// };

// export default SongListSection;
