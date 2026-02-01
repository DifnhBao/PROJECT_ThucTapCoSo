const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const allRoutes = require("./routes/index");
require("dotenv").config();

const { sequelize, syncDatabase } = require("./models");

const app = express();

// Middleware

// app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://project-web-gamma-neon.vercel.app",
    ],
    credentials: true,
  })
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
  console.log(`Server đang test trên port: ${PORT}`);

  try {
    await sequelize.authenticate();
    console.log("Connect successfully");
    await syncDatabase();
  } catch (error) {
    console.error("Can't connect", error);
  }
});
