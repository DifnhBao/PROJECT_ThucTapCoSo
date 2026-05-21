"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import "@/app/features/player/components/Player.css";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import PopUp from "../../../components/ui/PopUp";
import AddToPlaylistModal from "@/app/features/playlist/components/AddToPlaylistModal";
import { IoHeart, IoHeartOutline } from "react-icons/io5";

const mockQueue = [
  {
    id: 1,
    title: "Nếu Biết Đó Là Lần Cuối",
    artist: "Đức Trường",
    cover: "https://i.scdn.co/image/ab67616d00001e02b667917dd1a458f91d15b146",
  },
  {
    id: 2,
    title: "Waiting For You",
    artist: "MONO",
    cover: "https://picsum.photos/100?random=2",
  },
  {
    id: 3,
    title: "Lạc Trôi",
    artist: "Sơn Tùng",
    cover: "https://picsum.photos/100?random=3",
  },
];

const PlayerContent: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    next,
    prev,
    togglePlay,
    audioState,
    seek,
    setVolume,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
  } = usePlayer();
  const { likedMap, toggleLike, fetchLikeStatus } = useLikeContext();

  const [volumeUI, setVolumeUI] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  // state khóa nút like chống spam click
  const [isLiking, setIsLiking] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Sync track id into URL ──
  useEffect(() => {
    if (!currentTrack?.trackId) return;
    if (searchParams.get("track") === String(currentTrack.trackId)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("track", String(currentTrack.trackId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentTrack?.trackId, pathname, router, searchParams]);

  // ── Like status ──
  useEffect(() => {
    if (currentTrack?.trackId) fetchLikeStatus(currentTrack.trackId);
  }, [currentTrack?.trackId, fetchLikeStatus]);

  const liked = currentTrack
    ? (likedMap[currentTrack.trackId] ?? false)
    : false;

  // ── Progress bar ──
  const { currentTime, duration } = audioState;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const prog = Number(e.target.value);
    if (!duration) return;
    const newTime = (prog / 100) * duration;
    seek(newTime);
  };

  // ── Volume ──
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolumeUI(newVolume);
    setVolume(newVolume / 100);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const vol = volumeUI / 100 || 0.5;
      setVolume(vol);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  // ── Helpers ──
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volumeUI === 0) return "fa-volume-xmark";
    if (volumeUI < 50) return "fa-volume-low";
    return "fa-volume-high";
  };

  // HÀM XỬ LÝ TRÁNH SPAM CLICK
  const handleLikeClick = async () => {
    if (!currentTrack || isLiking) return; // Đang xử lý thì bỏ qua

    setIsLiking(true); // Khóa nút
    try {
      await toggleLike(currentTrack.trackId);
    } catch (error) {
      console.error("Lỗi khi like:", error);
    } finally {
      // Mở khóa nút sau 500ms (Debounce nhẹ)
      setTimeout(() => {
        setIsLiking(false);
      }, 500);
    }
  };

  return (
    <footer className="info">
      {/* ── Track info ── */}
      <div className="info-player">
        <Link
          className="background-singer"
          scroll={false}
          href={`/DetailSong?track=${currentTrack?.trackId ?? ""}`}
        >
          <img
            src={currentTrack?.imageUrl || "/images/default-song.jpg"}
            alt="cover"
          />
        </Link>
        <div className="song-row">
          <div className="info-song">
            <a className="song-tittle">{currentTrack?.title || "—"}</a>
            <a className="artist-name">{currentTrack?.artistName || "—"}</a>
          </div>
          <div className="song-actions">
            <button
              className={`icon-btn like-icon ${liked ? "liked" : ""}`}
              onClick={handleLikeClick}
              disabled={!currentTrack || isLiking}
              style={{
                opacity: isLiking ? 0.5 : 1,
                cursor: isLiking ? "wait" : "pointer",
              }}
            >
              {liked ? (
                <IoHeart className="fa-solid fa-heart" />
              ) : (
                <IoHeartOutline className="fa-regular fa-heart" />
              )}
            </button>
            <button
              className="icon-btn expand-icon"
              onClick={() => setShowUserMenu((v) => !v)}
            >
              <i className="fa-solid fa-ellipsis" />
            </button>
          </div>
        </div>

        {showUserMenu && (
          <PopUp show={showUserMenu} onClose={() => setShowUserMenu(false)}>
            <div className="Other-options-popup">
              <button>
                <i className="fa-regular fa-heart" />
                <span>Thêm vào yêu thích</span>
              </button>
              <button
                onClick={() => {
                  setShowAddToPlaylist(true);
                  setShowUserMenu(false);
                }}
              >
                <i className="fa-solid fa-circle-plus" />
                <span>Thêm vào playlist</span>
              </button>
              <button>
                <i className="fa-regular fa-flag" />
                <span>Báo cáo</span>
              </button>
            </div>
          </PopUp>
        )}
      </div>

      {/* ── Add to Playlist Modal ── */}
      {showAddToPlaylist && currentTrack && (
        <AddToPlaylistModal
          trackId={currentTrack.trackId}
          trackTitle={currentTrack.title || "Bài hát"}
          onClose={() => {
            setShowAddToPlaylist(false);
            setShowUserMenu(false);
          }}
          onSuccess={() => {
            // Optional: refresh something if needed
          }}
        />
      )}

      {/* ── Playback controls ── */}
      <div className="player-center">
        <div className="run">
          <span className="current-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="seek-bar"
            value={progress}
            min={0}
            max={100}
            onChange={handleSeek}
          />
          <span className="music-time">{formatTime(duration)}</span>
        </div>

        <div className="control">
          {/* NÚT SHUFFLE ĐÃ ĐƯỢC CẬP NHẬT */}
          <button
            className="play"
            onClick={toggleShuffle}
            style={{
              color: isShuffle ? "var(--tt-orange)" : "var(--tt-text-muted)",
            }}
          >
            <i className="fa-solid fa-shuffle" />
          </button>
          <button id="prevBtn" className="play" onClick={() => prev()}>
            <i className="fa-solid fa-backward-step" />
          </button>
          <button id="playBtn" className="play-btn" onClick={togglePlay}>
            <i className={isPlaying ? "fas fa-pause" : "fas fa-play"} />
          </button>
          <button id="nextBtn" className="play" onClick={() => next()}>
            <i className="fa-solid fa-forward-step" />
          </button>

          {/* NÚT REPEAT ĐÃ ĐƯỢC GẮN LOGIC */}
          <button
            className="play"
            onClick={toggleRepeat}
            style={{
              color: isRepeat ? "var(--tt-orange)" : "var(--tt-text-muted)",
            }}
          >
            <i className="fa-solid fa-repeat" />
          </button>
        </div>
      </div>

      {/* ── Volume ── */}
      <div className="vol">
        <button className="volume" onClick={toggleMute}>
          <i className={`fa-solid ${getVolumeIcon()}`} />
        </button>
        <input
          className="seek-volume"
          type="range"
          value={isMuted ? 0 : volumeUI}
          min={0}
          max={100}
          onChange={handleVolumeChange}
        />
      </div>

      {/* ── Queue ── */}
      <div className="queue">
        <div className="queue-header">
          <p>Next in queue</p>
        </div>
        <div className="queue-list">
          {mockQueue.map((song, index) => (
            <div
              key={song.id}
              className={`queue-item ${index === 0 ? "next" : ""}`}
            >
              <p>Update soon</p>
              {/* <img src={song.cover} alt={song.title} />
              <div className="queue-info">
                <p className="queue-title">{song.title}</p>
                <p className="queue-artist">{song.artist}</p>
              </div>
              {index === 0 && <span className="playing-dot" />} */}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

const Player: React.FC = () => (
  <Suspense fallback={<div className="hidden">Loading Player...</div>}>
    <PlayerContent />
  </Suspense>
);

export default Player;
