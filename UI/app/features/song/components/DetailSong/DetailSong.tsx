"use client";
import { usePlayerControls } from '@/app/features/player/context/PlayerContext';
import { formError } from '@/app/lib/form-error';
import { useLikeContext } from "@/app/features/like/context/LikeContext";
import type { Track } from "@/app/types/music";
import { useRating } from "@/app/features/rating/useRating";
import "@/app/features/song/components/DetailSong/DetailSong.css";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";
import { IoIosArrowBack } from "react-icons/io";

const DetailSong = ({ track: currentTrack }: { track: Track }) => {
  const router = useRouter();
  const { setPlaylist } = usePlayerControls();
  const [actionError, setActionError] = useState("");




  const [hoverRating, setHoverRating] = useState(0);
  const { submitRating, fetchRatingData, userRating, summary, loading } = useRating();

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
      setActionError(formError(error));
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
  }, [currentTrack?.trackId, fetchRatingData, fetchLikeStatus]);

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
      <button aria-label="Quay lại" className="back-btn-detail" onClick={() => router.back()}>
        <IoIosArrowBack />
      </button>

      <div
        className="background-blur"
        style={{ backgroundImage: `url(${currentTrack.imageUrl})` }}
      ></div>

      <div className="content-wrapper">
        <div className="left-section">
          <div className="image-card">
            <img width={300} height={300} src={currentTrack.imageUrl} alt={currentTrack.title} />

          </div>

          {actionError && <p role="alert">{actionError}</p>}
          <button onClick={() => setPlaylist([currentTrack], 0)}>Phát bài hát</button>
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


          </div>

          <div className="rating-section-inline">
            <h2 className="rating-title">Đánh giá bài hát</h2>

            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button disabled={loading}
                  aria-label={`Đánh giá ${star} sao`}
                  key={star}
                  className={`fa-star ${
                    (hoverRating || userRating || 0) >= star
                      ? "fa-solid filled"
                      : "fa-regular"
                  }`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => { void submitRating(currentTrack.trackId, star).catch((error) => setActionError(formError(error))); }}
                />
              ))}

            </div>

            <p className="rating-text">
              {userRating
                ? `Bạn đã đánh giá ${userRating} / 5`
                : "Chưa đánh giá"} ({summary.totalRatings})
            </p>



          </div>


        </div>
        <div className="right-section">
          <div className="song-info">
            <h1>{currentTrack.title}</h1>
            <p>{currentTrack.artistName}</p>
          </div>

        </div>
      </div>




    </div>
  );
};

export default DetailSong;
