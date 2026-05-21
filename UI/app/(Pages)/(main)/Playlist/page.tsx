"use client";

import { useState } from "react";
import { usePlaylists } from "@/app/features/playlist/hooks/usePlaylists";
import { usePlaylistDetail } from "@/app/features/playlist/hooks/usePlaylistDetail";
import { removeSongFromPlaylistService, deletePlaylistService } from "@/app/features/playlist/service";
import DetailView from "@/app/features/playlist/components/DetailView";
import PlaylistCover from "@/app/components/FeaturedPlaylists/PlaylistCover";
import CreatePlaylistModal from "@/app/features/playlist/components/CreatePlaylistModal";
import type { DetailViewData } from "@/app/types/music";
import "./Playlist.css";

export default function PlaylistsPage() {
  const { playlists, loading: playlistsLoading, error, fetchPlaylists } = usePlaylists();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { playlist: playlistDetail, loading: detailLoading, fetchPlaylistDetail } = usePlaylistDetail(selectedPlaylistId);

  const handleRemoveSong = async (songId: number) => {
    if (!selectedPlaylistId) return;

    const isConfirm = window.confirm("Bạn có chắc chắn muốn xóa bài hát này khỏi playlist không?");
    if (!isConfirm) return;

    try {
      await removeSongFromPlaylistService(selectedPlaylistId, songId);
      fetchPlaylistDetail();
      fetchPlaylists();
    } catch (err: any) {
      alert("Lỗi khi xóa bài hát: " + err.message);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylistId) return;

    const isConfirm = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ playlist này không? Hành động này không thể hoàn tác.");
    if (!isConfirm) return;

    try {
      await deletePlaylistService(selectedPlaylistId);
      setSelectedPlaylistId(null);
      fetchPlaylists();
    } catch (err: any) {
      alert("Lỗi khi xóa playlist: " + err.message);
    }
  };

  if (selectedPlaylistId) {
    if (detailLoading) return <div>Đang tải chi tiết playlist...</div>;
    if (!playlistDetail) return <div>Không tìm thấy chi tiết playlist. <button onClick={() => setSelectedPlaylistId(null)}>Quay lại</button></div>;

    const detailData: DetailViewData = {
      type: "playlist",
      title: playlistDetail.name,
      coverImages: playlistDetail.songs?.map((s: any) => s.imageUrl).filter(Boolean) || [],
      tracks: (playlistDetail.songs || []).map((song: any) => ({
        trackId: song.songId || song.id,
        title: song.title,
        duration: song.duration || 0,
        imageUrl: song.imageUrl || "/images/default-song.jpg",
        audioUrl: song.audioUrl,
        artistName: song.artistName || "Unknown",
        genre: "",
        viewCount: 0,
        isVisible: true
      }))
    };

    return <DetailView data={detailData} onBack={() => setSelectedPlaylistId(null)} onRemoveSong={handleRemoveSong} onDeletePlaylist={handleDeletePlaylist} />;
  }

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

      {playlistsLoading ? (
        <div>Đang tải playlists...</div>
      ) : playlists.length === 0 ? (
        <div>Chưa có playlist nào. Hãy tạo một playlist mới.</div>
      ) : (
        <div className="playlist-grid">
          {playlists.map((playlist: any) => (
            <div key={playlist.playlistId} className="playlist-card">
              <div 
                className="playlist-card-cover"
                onClick={() => setSelectedPlaylistId(playlist.playlistId)}
                style={{ cursor: "pointer" }}
              >
                <PlaylistCover 
                  images={playlist.songs?.map((s: any) => s.imageUrl).filter(Boolean) || []} 
                  size={"100%" as any} 
                />
                <button
                  className="playlist-play-btn"
                  onClick={(e) => {
                    // e.stopPropagation();
                    setSelectedPlaylistId(playlist.playlistId)
                  }}
                >
                  <i className="fa-solid fa-play" />
                </button>
              </div>
              <div className="playlist-card-info">
                <h2>{playlist.name}</h2>
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
