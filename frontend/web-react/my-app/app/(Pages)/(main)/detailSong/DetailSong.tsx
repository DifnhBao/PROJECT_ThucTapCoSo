"use client";
import "@/app/styles/DetailSong.css";
import { usePlayer } from "@/app/context/PlayerContext";
import { BsSend } from "react-icons/bs";

const DetailSong = () => {
  const { playlist, currentIndex } = usePlayer();
  const currentTrack = playlist[currentIndex];

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

  //   const song = {
  //     title: "Vết Mưa (AI Remastered)",
  //     artist: "Cát Tường",
  //     cover:
  //       "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80",
  //     lyrics: [
  //       "Cơn mưa đi ngang qua",
  //       "Mang theo bao nỗi nhớ",
  //       "Dòng thời gian lặng lẽ",
  //       "Mình tôi với cơn mơ",
  //     ],
  //     aiScore: 95,
  //   };

  return (
    <div className="detail-container">
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
      <div className="comment-section">
        <h2>Bình luận</h2>
        <div className="comment-input-wrapper">
          <input type="text" placeholder="Chia sẻ cảm nhận của bạn..." />
          <button>
            <BsSend />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailSong;
