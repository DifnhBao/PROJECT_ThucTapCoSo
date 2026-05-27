const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const allRoutes = require("./routes/index");
require("dotenv").config();

// Kéo cấu hình MySQL (Sequelize)
const { sequelize, syncDatabase } = require("./models");
// Import hàm kết nối MongoDB
// const connectMongoDB = require("./config/mongodb");

const app = express();

// --- CORS: Hỗ trợ cả local dev lẫn Docker ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000", // Local dev
  "http://ui:3000", // Docker internal
  "https://project-web-gamma-neon.vercel.app",
  "https://project-thuc-tap-co-so.vercel.app",
  // Thêm domain production ở đây nếu cần
];

// app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép request không có origin (Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  }),
);

app.set("etag", false);

app.use("/api", allRoutes);

app.get("/", (req, res) => {
  res.send("API Backend");
});

// Đặt "lưới" bắt lỗi ở CUỐI CÙNG
const globalErrorHandler = require("./midlewares/error.midleware");
app.use(globalErrorHandler);
// --- KẾT THÚC THÊM MỚI ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server đang test trên port: ${PORT}`);

  try {
    // 1. Kết nối và đồng bộ MySQL
    await sequelize.authenticate();
    console.log(">>> MySQL: Connect successfully <<<");
    await syncDatabase();

    // 2. Kết nối MongoDB
    // await connectMongoDB();
  } catch (error) {
    console.error(">>> Lỗi kết nối Database:", error);
  }
});
