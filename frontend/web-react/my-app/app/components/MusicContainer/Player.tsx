"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePlayer } from "@/app/context/PlayerContext";
import PopUp from "../PopUp";
import "@/app/styles/PlayerBar.css";
import {
  likeSong,
  unlikeSong,
  getLikeStatus,
  increaseSongView,
} from "@/app/utils/songApi";


const PlayerContent: React.FC = () => {
  const {
    playlist,
    play,
    pause,
    togglePlay,
    isPlaying,
    currentIndex,
    setIndex,
  } = usePlayer();

  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const viewedRef = useRef(false);
  const trackIdRef = useRef<number | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Lấy bài hiện tại
  const currentSong = playlist[currentIndex];

  useEffect(() => {
    if (!currentSong?.trackId) return;

    viewedRef.current = false;
    trackIdRef.current = currentSong.trackId;

    const params = new URLSearchParams(searchParams.toString());
    params.set("track", String(currentSong.trackId));

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }, [currentIndex]);

  // Like button
  const toggleLike = async () => {
    console.log("curentsong: ", currentSong);
    if (!currentSong?.trackId || likeLoading) return;

    try {
      setLikeLoading(true);

      if (liked) {
        await unlikeSong(currentSong.trackId);
        setLiked(false);
      } else {
        await likeSong(currentSong.trackId);
        setLiked(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLikeLoading(false);
    }
  };

  useEffect(() => {
    if (!currentSong?.trackId) return;

    setLiked(false);

    getLikeStatus(currentSong.trackId)
      .then((res) => setLiked(res.liked))
      .catch(() => setLiked(false));
  }, [currentSong?.trackId]);

  // Theo dõi tiến trình phát
  useEffect(() => {
    const audio = (window as any)._audioRef as HTMLAudioElement;
    console.log("DEBUG audio ref:", audio);
    if (!audio) return;

    const updateProgress = () => {
      if (!audio.duration) return;

      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);

      //TĂNG VIEW SAU 20 GIÂY – CHỈ 1 LẦN
      if (audio.currentTime >= 20 && !viewedRef.current && trackIdRef.current) {
        increaseSongView(trackIdRef.current);
        viewedRef.current = true;
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
    };
  }, [currentIndex]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = (window as any)._audioRef as HTMLAudioElement;
    if (!audio || !duration) return;

    const newProgress = Number(e.target.value);
    const newTime = (newProgress / 100) * duration;

    setProgress(newProgress);
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  // Xử lý next / prev
  const handleNext = () => {
    if (playlist.length > 0) {
      setIndex((currentIndex + 1) % playlist.length);
    }
  };

  const handlePrev = () => {
    if (playlist.length > 0) {
      setIndex((currentIndex - 1 + playlist.length) % playlist.length);
    }
  };

  // Khi kéo thanh volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    const audio = (window as any)._audioRef as HTMLAudioElement;
    if (audio) {
      audio.volume = newVolume / 100;
      setIsMuted(audio.volume === 0);
    }
  };

  // Khi click icon volume
  const toggleMute = () => {
    const audio = (window as any)._audioRef as HTMLAudioElement;
    if (!audio) return;

    if (isMuted) {
      // Bật lại âm thanh
      audio.volume = volume / 100;
      setIsMuted(false);
    } else {
      // Tắt âm thanh
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  // format theo thời gian
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // icon thay đổi theo trạng thái âm lượng
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return "fa-volume-xmark";
    if (volume < 50) return "fa-volume-low";
    return "fa-volume-high";
  };

  return (
    <footer className="info">
      <div className="info-player">
        <a className="background-singer">
          <img
            src={currentSong?.imageUrl || "/images/default-song.jpg"}
            alt="Singer"
          />
        </a>

        <div className="info-song">
          <a href="#" className="song-tittle">
            {currentSong?.title || "No song"}
          </a>
          <a href="#" className="artist-name">
            {currentSong?.artistName || "Unknown"}
          </a>
        </div>

        <button
          className={`icon-btn like-icon ${liked ? "liked" : ""}`}
          onClick={toggleLike}
          disabled={likeLoading}
        >
          <i
            className={liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}
          ></i>
        </button>

        <button
          className="icon-btn expand-icon"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <i className="fa-solid fa-ellipsis"></i>
        </button>
        {showUserMenu && (
          <PopUp show={showUserMenu} onClose={() => setShowUserMenu(false)}>
            <div className="Other-options-popup">
              <button>
                <i className="fa-regular fa-heart"></i>
                <span>Thêm vào yêu thích</span>
              </button>

              <button>
                <i className="fa-solid fa-circle-plus"></i>
                <span>Thêm vào playlist</span>
              </button>

              <button>
                <i className="fa-regular fa-flag"></i>
                <span>Báo cáo</span>
              </button>
            </div>
          </PopUp>
        )}
      </div>

      <div className="player-center">
        <div className="control">
          <button className="play">
            <i className="fa-solid fa-shuffle"></i>
          </button>
          <button id="prevBtn" className="play" onClick={handlePrev}>
            <i className="fa-solid fa-backward-step"></i>
          </button>
          <button id="playBtn" className="play-btn" onClick={togglePlay}>
            <i className={isPlaying ? "fas fa-pause" : "fas fa-play"}></i>
          </button>
          <button id="nextBtn" className="play" onClick={handleNext}>
            <i className="fa-solid fa-forward-step"></i>
          </button>
          <button className="play">
            <i className="fa-solid fa-repeat"></i>
          </button>
        </div>

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
      </div>

      <div className="vol">
        <button className="volume" onClick={toggleMute}>
          <i className={`fa-solid ${getVolumeIcon()}`}></i>
        </button>
        <input
          className="seek-volume"
          type="range"
          value={volume}
          min={0}
          max={100}
          onChange={handleVolumeChange}
        />
      </div>
    </footer>
  );
};

// --- PHẦN BỌC SUSPENSE ---
const Player: React.FC = () => {
  return (
    <Suspense fallback={<div className="hidden">Loading Player...</div>}>
      <PlayerContent />
    </Suspense>
  );
};

export default Player;