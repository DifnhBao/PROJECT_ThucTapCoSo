"use client";
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import "@/app/features/player/components/Player.css";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import AddToPlaylistModal from "@/app/features/playlist/components/AddToPlaylistModal";
import Link from "next/link";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import React,{ Suspense,useEffect,useState } from "react";
import { IoHeart,IoHeartOutline } from "react-icons/io5";
import PopUp from "../../../components/ui/PopUp";

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
    repeatMode, isBuffering, audioError, queueError, loadingMore, retryAudio, retryQueue,
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
    <footer className="bottom-bar-player">
      {(audioError || queueError || isBuffering || loadingMore) && (
        <div className="player-feedback" role={audioError || queueError ? 'alert' : 'status'}>
          <span>{[audioError, queueError].filter(Boolean).join(' ') || (isBuffering ? 'Đang tải âm thanh…' : 'Đang tải bài tiếp theo…')}</span>
          {(audioError || isBuffering) && <button onClick={retryAudio}>Thử lại</button>}
          {queueError && <button onClick={() => void retryQueue()}>Thử tải tiếp</button>}
          {audioError && <button onClick={() => void next()}>Bỏ qua</button>}
        </div>
      )}

      {/* ── TRÁI: Playback controls ── */}
      <div className="player-left">
        <button
          className="play"
          onClick={toggleShuffle}
          aria-label="Phát ngẫu nhiên" aria-pressed={isShuffle}
          style={{ color: isShuffle ? "var(--tt-orange)" : "var(--tt-text-muted)" }}
        >
          <i aria-hidden="true" className="fa-solid fa-shuffle" />
        </button>
        <button id="prevBtn" className="play" aria-label="Bài trước" disabled={!currentTrack} onClick={() => prev()}>
          <i aria-hidden="true" className="fa-solid fa-backward-step" />
        </button>
        <button id="playBtn" className="play-btn" aria-label={isPlaying ? "Tạm dừng" : "Phát"} disabled={!currentTrack} onClick={togglePlay}>
          <i aria-hidden="true" className={isPlaying ? "fas fa-pause" : "fas fa-play"} />
        </button>
        <button id="nextBtn" className="play" aria-label="Bài tiếp theo" disabled={!currentTrack} onClick={() => void next()}>
          <i aria-hidden="true" className="fa-solid fa-forward-step" />
        </button>
        <button
          className="play"
          onClick={toggleRepeat}
          aria-label={`Lặp: ${repeatMode === 'off' ? 'Tắt' : repeatMode === 'one' ? 'Một bài' : 'Tất cả'}`}
          title={repeatMode === 'off' ? 'Tắt lặp' : repeatMode === 'one' ? 'Lặp một bài' : 'Lặp tất cả'}
          style={{ color: isRepeat ? "var(--tt-orange)" : "var(--tt-text-muted)" }}
        >
          <i aria-hidden="true" className="fa-solid fa-repeat" />{repeatMode === "one" && <small>1</small>}
        </button>
      </div>

      {/* ── GIỮA: Track info & Progress ── */}
      <div className="player-center">
        <div className="center-wrapper">
          {/* Hàng trên: Ảnh bìa + Text */}
          <div className="center-info">
            <Link
              aria-label={currentTrack ? `Xem bài hát: ${currentTrack.title}` : "Trang chủ"} className="center-cover"
              scroll={false}
              href={currentTrack ? `/songs/${currentTrack.trackId}` : "/Home"}
            >
              <img width={56} height={56}
                src={currentTrack?.imageUrl || "/images/default-song.svg"}
                alt=""
              />
            </Link>
            <div className="center-text">
              <span className="song-tittle">{currentTrack?.title || "—"}</span>
              <span className="artist-name">{currentTrack?.artistName || "—"}</span>
            </div>
          </div>

          {/* Hàng dưới: Thanh tiến trình + Thời gian */}
          <div className="run">
            <span className="current-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="seek-bar"
              aria-label="Vị trí phát" aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
              value={progress || 0}
              min={0}
              max={100}
              onChange={handleSeek}
              style={{
                // Tô màu phần đã phát bằng linear-gradient
                background: `linear-gradient(to right, var(--tt-text-primary, #111) ${progress || 0}%, rgba(0,0,0,0.1) ${progress || 0}%)`
              }}
            />
            <span className="music-time">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* ── PHẢI: Actions & Volume ── */}
      <div className="player-right">
        <div className="song-actions">
          <button
            aria-label="Yêu thích bài hát" aria-pressed={liked} className={`icon-btn like-icon ${liked ? "liked" : ""}`}
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

          <div className="menu-wrapper" style={{ position: "relative" }}>
            <button
              aria-label="Tùy chọn bài hát" aria-expanded={showUserMenu} data-dialog-return className="icon-btn expand-icon"
              onClick={() => setShowUserMenu((v) => !v)}
            >
              <i aria-hidden="true" className="fa-solid fa-ellipsis" />
            </button>

            {showUserMenu && (
              <PopUp show={showUserMenu} onClose={() => setShowUserMenu(false)}>
                <div className="Other-options-popup">
                  <button onClick={handleLikeClick} disabled={!currentTrack || isLiking}>
                    <i aria-hidden="true" className="fa-regular fa-heart" />
                    <span>Thêm vào yêu thích</span>
                  </button>
                  <button aria-label="Thêm vào playlist"
                    onClick={() => {
                      setShowAddToPlaylist(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <i aria-hidden="true" className="fa-solid fa-circle-plus" />
                    <span>Thêm vào playlist</span>
                  </button>

                </div>
              </PopUp>
            )}
          </div>
        </div>

        <div className="vol">
          <button aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"} aria-pressed={isMuted} className="volume" onClick={toggleMute}>
            <i aria-hidden="true" className={`fa-solid ${getVolumeIcon()}`} />
          </button>
          <input
            aria-label="Âm lượng" aria-valuetext={`${isMuted ? 0 : volumeUI}%`} className="seek-volume"
            type="range"
            value={isMuted ? 0 : volumeUI}
            min={0}
            max={100}
            onChange={handleVolumeChange}
            style={{
              // Tô màu phần âm lượng hiện tại
              background: `linear-gradient(to right, var(--tt-text-primary, #111) ${isMuted ? 0 : volumeUI}%, rgba(0,0,0,0.1) ${isMuted ? 0 : volumeUI}%)`
            }}
          />
        </div>
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
          onSuccess={() => {}}
        />
      )}
    </footer>
  );


};

const Player: React.FC = () => (
  <Suspense fallback={<div className="hidden">Loading Player...</div>}>
    <PlayerContent />
  </Suspense>
);

export default Player;
