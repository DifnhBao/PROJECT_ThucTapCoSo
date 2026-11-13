"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";
import CreatePlaylistModal from "@/app/features/playlist/components/CreatePlaylistModal";
import { usePlaylists } from "@/app/features/playlist/hooks/usePlaylists";
import { useState } from "react";
import "./Playlist.css";

export default function PlaylistsPage() {
  const router = useRouter();
  const { playlists, loading: playlistsLoading, error, fetchPlaylists } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);


  return (
    <div className="playlist-page">
      <div className="playlist-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="main-title"> Danh sách Playlist</h1>
        <button
          className="create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="fa-solid fa-plus"></i> Tạo playlist mới
        </button>
      </div>

      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchPlaylists();
            setShowCreateModal(false);
          }}
        />
      )}

      {error && <div role="alert">{error}</div>}
      {playlistsLoading ? (
        <div>Đang tải playlists...</div>
      ) : error ? (<button onClick={() => void fetchPlaylists()}>Thử lại</button>) : playlists.length === 0 ? (
        <div>Chưa có playlist nào. Hãy tạo một playlist mới.</div>
      ) : (
        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <div key={playlist.playlistId} className="playlist-card">
              <div
                className="playlist-card-cover"
                onClick={() => router.push(`/playlists/${playlist.playlistId}`)}
                style={{ cursor: "pointer" }}
              >
                <PlaylistCover
                  images={playlist.songs?.map((s) => s.imageUrl).filter((url): url is string => Boolean(url)) || []}
                  size="100%"
                />
                <button
                  className="playlist-play-btn"
                  onClick={() => {
                    router.push(`/playlists/${playlist.playlistId}`)
                  }}
                >
                  <i className="fa-solid fa-play" />
                </button>
              </div>
              <div className="playlist-card-info">
                <h2><Link href={`/playlists/${playlist.playlistId}`}>{playlist.name}</Link></h2>
                {playlist.description && <p>{playlist.description}</p>}
                <span>{playlist.songs?.length ?? 0} bài hát</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
