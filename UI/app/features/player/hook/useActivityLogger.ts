import { useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { increaseSongView } from "@/app/features/song/song.api";

export type ActivitySource = "search" | "playlist" | "recommendation" | "radio";
type ExitReason = "ended" | "skipped" | "tab_closed";

// const API_URL = "http://localhost:5000/api/activity";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api/activity";

export function useActivityLogger(source: ActivitySource = "playlist") {
  const sourceRef = useRef(source);
  const trackRef = useRef<{ trackId: number; duration: number } | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // --- GIỎ DỮ LIỆU TỔNG HỢP (AGGREGATION BUCKET) ---
  const sessionDataRef = useRef({
    totalListenedTime: 0,
    maxPositionReached: 0,
    playPauseCount: 0,
    seekCount: 0,
  });

  // Biến phụ trợ để tính toán thời gian
  const lastPlayTimestampRef = useRef<number>(0);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  // HÀM CHỐT SỔ VÀ GỬI API 1 LẦN DUY NHẤT
  const flushSession = useCallback(
    async (reason: ExitReason, isBeacon = false) => {
      const t = trackRef.current;
      if (!t || !sessionIdRef.current) return;

      // 1. Chốt thời gian nghe cuối cùng trước khi đóng session
      let finalListenedTime = sessionDataRef.current.totalListenedTime;
      if (lastPlayTimestampRef.current > 0) {
        finalListenedTime += (Date.now() - lastPlayTimestampRef.current) / 1000;
        lastPlayTimestampRef.current = 0; // Đặt lại 0 để không bị tính đúp
      }

      // Nếu thời gian nghe < 1s (chỉ bấm nhầm rồi next luôn), có thể bỏ qua không gửi để tiết kiệm DB
      if (finalListenedTime < 1 && reason !== "ended") return;

      const payload = {
        song_id: t.trackId,
        session_id: sessionIdRef.current,
        total_listened_time: Number(finalListenedTime.toFixed(2)),
        song_duration: t.duration,
        max_position_reached: Number(
          sessionDataRef.current.maxPositionReached.toFixed(2),
        ),
        play_pause_count: sessionDataRef.current.playPauseCount,
        seek_count: sessionDataRef.current.seekCount,
        exit_reason: reason,
        source: sourceRef.current,
      };

      console.log("Đã chốt sổ và gửi Session:", payload);

      try {
        if (isBeacon) {
          const blob = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          });
          navigator.sendBeacon(API_URL, blob);
        } else {
          await axios.post(API_URL, payload, { withCredentials: true });
        }
      } catch (err) {
        console.error("[ActivityLogger] flush failed:", err);
      }
    },
    [],
  );

  // NATIVE EVENT HANDLERS (Gắn vào thẻ <audio>)
  const initTrack = useCallback(
    (trackId: number, duration: number, newSource?: ActivitySource) => {
      // Cập nhật nguồn ngay lập tức nếu được truyền vào
      if (newSource) {
        sourceRef.current = newSource;
      }

      // 1. Chốt sổ bài cũ (nếu có) với lý do "skipped" (vì người dùng chuyển bài)
      flushSession("skipped");

      // 2. Khởi tạo Giỏ dữ liệu mới cho bài này
      trackRef.current = { trackId, duration };
      sessionIdRef.current = crypto.randomUUID();
      sessionDataRef.current = {
        totalListenedTime: 0,
        maxPositionReached: 0,
        playPauseCount: 0,
        seekCount: 0,
      };
      lastPlayTimestampRef.current = 0;
      hasViewedRef.current = false;
    },
    [flushSession],
  );

  const handlePlay = useCallback(() => {
    if (!trackRef.current) return;
    lastPlayTimestampRef.current = Date.now();
    sessionDataRef.current.playPauseCount += 1;
  }, []);

  const handlePause = useCallback(() => {
    if (!trackRef.current) return;
    if (lastPlayTimestampRef.current > 0) {
      const delta = (Date.now() - lastPlayTimestampRef.current) / 1000;
      sessionDataRef.current.totalListenedTime += delta;
      lastPlayTimestampRef.current = 0; // Tạm dừng đếm giờ
    }
    sessionDataRef.current.playPauseCount += 1;
  }, []);

  const handleTimeUpdate = useCallback((position: number) => {
    if (!trackRef.current) return;

    // Chỉ cập nhật kỷ lục nghe xa nhất
    if (position > sessionDataRef.current.maxPositionReached) {
      sessionDataRef.current.maxPositionReached = position;
    }

    // Tăng view ngầm nếu tổng thời gian > 20s (Có thể làm realtime)
    let currentTotal = sessionDataRef.current.totalListenedTime;
    if (lastPlayTimestampRef.current > 0) {
      currentTotal += (Date.now() - lastPlayTimestampRef.current) / 1000;
    }

    if (currentTotal >= 20 && !hasViewedRef.current) {
      increaseSongView(trackRef.current.trackId);
      hasViewedRef.current = true;
    }
  }, []);

  const handleSeek = useCallback((newPosition: number) => {
    if (!trackRef.current) return;
    sessionDataRef.current.seekCount += 1;

    if (newPosition > sessionDataRef.current.maxPositionReached) {
      sessionDataRef.current.maxPositionReached = newPosition;
    }
  }, []);

  const handleEnded = useCallback(() => {
    // Chốt sổ với lý do "ended"
    flushSession("ended");

    // Xóa session để không bị gửi lại
    sessionIdRef.current = null;
    trackRef.current = null;
  }, [flushSession]);

  // Handle tắt tab/ứng dụng đột ngột
  useEffect(() => {
    // pagehide hoạt động tốt và đáng tin cậy trên cả Desktop và Mobile
    // Nó chỉ chạy khi user thực sự rời khỏi hẳn trang web (đóng tab, reload, back lại)
    const handleUnload = () => {
      flushSession("tab_closed", true); // Dùng Beacon để đảm bảo gửi được khi tab đang đóng
    };

    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      // Xóa flushSession ở đây đi để tránh gửi 2 lần khi component unmount bình thường
    };
  }, [flushSession]);

  return {
    initTrack,
    handlePlay,
    handlePause,
    handleTimeUpdate,
    handleSeek,
    handleEnded,
  };
}
