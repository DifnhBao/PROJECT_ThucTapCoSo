"use client";

import { useEffect } from "react";
import "@/app/features/song/components/DetailSong/DetailSong.css";
import { usePlayer } from "@/app/features/player/context/PlayerContext";
import { BsSend } from "react-icons/bs";
import { useState } from "react";
import PopUp from "@/app/components/ui/PopUp";
import { useRating } from "@/app/features/rating/useRating";
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";

const DetailSong = () => {
  const router = useRouter();
  const { currentTrack } = usePlayer();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const [hoverRating, setHoverRating] = useState(0);
  const { submitRating, fetchRatingData, userRating, summary } = useRating();

  const { likedMap, toggleLike, fetchLikeStatus } = useLikeContext();

  // THÊM STATE KHÓA NÚT LIKE
  const [isLiking, setIsLiking] = useState(false);

  // HÀM XỬ LÝ TRÁNH SPAM CLICK
  const handleLikeClick = async () => {
    if (!currentTrack || isLiking) return;

    setIsLiking(true);
    try {
      await toggleLike(currentTrack.trackId);
    } catch (error) {
      console.error("Lỗi khi like:", error);
    } finally {
      setTimeout(() => {
        setIsLiking(false);
      }, 500);
    }
  };

  // Lấy trạng thái like của bài hát hiện tại
  const liked = currentTrack ? likedMap[currentTrack.trackId] || false : false;

  useEffect(() => {
    if (currentTrack?.trackId) {
      fetchRatingData(currentTrack.trackId);
      fetchLikeStatus(currentTrack.trackId);
    }
  }, [currentTrack?.trackId]);

  if (!currentTrack) {
    return (
      <div className="detail-container">
        <div className="content-wrapper">
          <h2 style={{ textAlign: "center", width: "100%" }}>
            Chưa có bài hát nào đang phát...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <button className="back-btn-detail" onClick={() => router.back()}>
        <IoIosArrowBack />
      </button>

      <div
        className="background-blur"
        style={{ backgroundImage: `url(${currentTrack.imageUrl})` }}
      ></div>

      <div className="content-wrapper">
        <div className="left-section">
          <div className="image-card">
            <img src={currentTrack.imageUrl} alt={currentTrack.title} />
            <div className="ai-badge">AI Match: 98%</div>
          </div>

          <div className="song-actions-detail">
            <button
              className={`icon-btn like-icon ${liked ? "liked" : ""}`}
              onClick={handleLikeClick}
              disabled={isLiking}
              style={{ opacity: isLiking ? 0.6 : 1 }}
            >
              <i
                className={liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}
              />{" "}
              <p>Like</p>
            </button>

            <button
              className="icon-btn expand-icon"
              // onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <i className="fa-solid fa-ellipsis"></i>
              <p>More</p>
            </button>
          </div>

          <div className="rating-section-inline">
            <h2 className="rating-title">Đánh giá bài hát</h2>

            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <i
                  key={star}
                  className={`fa-star ${
                    (hoverRating || userRating || 0) >= star
                      ? "fa-solid filled"
                      : "fa-regular"
                  }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => submitRating(currentTrack.trackId, star)}
                />
              ))}
              
            </div>

            <p className="rating-text">
              {userRating
                ? `Bạn đã đánh giá ${userRating} / 5`
                : "Chưa đánh giá"} ({summary.totalRatings})
            </p>
            {/* <p>{`( ${summary.totalRatings} )`}</p> */}

            {/* <p className="rating-text">
              {summary.averageRating.toFixed(1)} / 5 ({summary.totalRatings})
            </p> */}
          </div>

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
        <div className="right-section">
          <div className="song-info">
            <h1>{currentTrack.title}</h1>
            <p>{currentTrack.artistName}</p>
          </div>
          <div className="lyrics-container">
            {/* {song.lyrics.map((line, index) => (
              <p key={index} className={index === 0 ? "active" : ""}>
                {line}
              </p>
            ))} */}
            <p className="active">Giai điệu đang vang lên...</p>
            <p>Đang tải lời bài hát từ hệ thống AI...</p>
            <p className="opacity-40">Nghệ sĩ: {currentTrack.artistName}</p>
          </div>
        </div>
      </div>

      {/* <div className="rating-section">
        <h2>Đánh giá bài hát</h2>
        <div className="star">
          {[1, 2, 3, 4, 5].map((star) => (
            <i
              key={star}
              className={`fa-star ${
                (hoverRating || rating) >= star
                  ? "fa-solid filled"
                  : "fa-regular"
              }`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            ></i>
          ))}
        </div>
        <p className="rating-text">
          {rating > 0 ? `Bạn đã đánh giá ${rating}/5 sao` : "Chưa có đánh giá"}
        </p>
      </div> */}

      <div className="comment-section">
        <h2>Bình luận</h2>
        <div className="comment-input-wrapper">
          <input type="text" placeholder="Chia sẻ cảm nhận của bạn..." />
          <button onClick={() => alert("Tính năng sẽ được cập nhật sớm ~")}>
            <BsSend />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailSong;
