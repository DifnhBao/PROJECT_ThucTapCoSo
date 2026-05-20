const { UserActivity } = require("../models");

// 1. Khởi tạo RAM Buffer và các mốc giới hạn
let activityBuffer = [];
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 3 * 60 * 1000; // 3 phút
// const FLUSH_INTERVAL = 10 * 1000; // Đổi tạm thành 10 giây để test

// 2. Hàm thực thi việc Bulk Insert xuống MySQL
const flushActivities = async () => {
  if (activityBuffer.length === 0) return;

  // Lấy data ra và khóa mảng lại (tránh Race Condition)
  const dataToInsert = [...activityBuffer];
  activityBuffer = [];

  try {
    // Tắt hooks và logging để MySQL ghi với tốc độ bàn thờ =))
    await UserActivity.bulkCreate(dataToInsert, {
      hooks: false,
      logging: false,
    });
    console.log(
      `[Batch Insert] Đã ghi thành công ${dataToInsert.length} logs vào MySQL.`,
    );
  } catch (error) {
    console.error("[Batch Insert Error]:", error);
    // Nếu fail (ví dụ đứt cáp, DB sập), nhét data lại vào buffer để thử lại sau
    activityBuffer = [...dataToInsert, ...activityBuffer];
  }
};

// 3. Set interval chạy ngầm định kỳ
setInterval(flushActivities, FLUSH_INTERVAL);

/**
 * Controller xử lý API POST /api/activity
 */
const logActivity = async (req, res) => {
  try {
    const data = req.body;
    const user_id = req.user?.userId;

    if (!user_id || !data.song_id || !data.session_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Gắn user_id vào payload và đẩy vào Buffer
    activityBuffer.push({
      ...data,
      user_id,
      created_at: new Date(),
    });

    // Nếu Buffer đầy thì gọi flush ngay lập tức không chờ đến 3 phút
    if (activityBuffer.length >= BATCH_SIZE) {
      flushActivities();
    }

    // Trả về 200 OK ngay lập tức cho Frontend, không cần đợi Database ghi xong
    return res.status(200).json({ success: true, status: "queued" });
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { logActivity };

// Bắt sự kiện khi server chuẩn bị tắt (Ctrl+C hoặc bị kill)
const gracefulShutdown = async () => {
  if (activityBuffer.length > 0) {
    console.log(
      `[Graceful Shutdown] Đang cứu ${activityBuffer.length} logs cuối cùng trước khi tắt server...`,
    );
    await flushActivities();
  }
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown); // Khi ấn Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Khi system kill process
