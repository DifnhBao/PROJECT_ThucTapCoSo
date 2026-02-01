"use client";
import React from "react";
import "@/app/styles/myplaylists.css";

interface Playlist {
  title: string;
  songs: number;
  image: string;
}

const playlists: Playlist[] = [
  {
    title: "Chill Vibes",
    songs: 12,
    image: "https://wallpaperaccess.com/full/9629081.jpg",
  },
  {
    title: "Workout Mix",
    songs: 8,
    image: "https://i.ytimg.com/vi/p6meuJTlsc0/maxresdefault.jpg",
  },
  {
    title: "Love Songs",
    songs: 20,
    image: "https://static.animecorner.me/2023/08/1692350476-97006.jpg",
  },
  {
    title: "Hip Hop Hits",
    songs: 15,
    image: "https://wallpaper.dog/large/10810864.jpg",
  },
];

const MyPlaylistGrid: React.FC = () => {
  return (
    <div className="playlist-grid" id="playlistGrid">
      {playlists.map((playlist, index) => (
        <div className="playlist-card" key={index}>
          <img src={playlist.image} alt={playlist.title} />
          <p className="playlist-title">{playlist.title}</p>
          <p className="playlist-count">{playlist.songs} songs</p>
        </div>
      ))}
    </div>
  );
};

export default MyPlaylistGrid;
