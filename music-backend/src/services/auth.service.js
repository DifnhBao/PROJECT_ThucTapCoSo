const { User } = require("../models");
const { RefreshToken } = require("../models");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Hàm tạo TOKEN
const generateTokens = (payLoad) => {
  // Access token hiệu lực 30p
  const accessToken = jwt.sign(payLoad, JWT_SECRET, { expiresIn: "30m" });

  // Refresh token 7 ngày
  const refreshToken = jwt.sign(payLoad, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
  };
};

const registerUser = async (userData) => {
  const { email, password, username } = userData;

  // Kiểm tra trùng username
  const existingUser = await User.findOne({
    where: { username },
  });

  if (existingUser) {
    throw new Error("Username đã được sử dụng");
  }

  const newUser = await User.create({
    email,
    password,
    username,
  });

  newUser.password = undefined;
  return { user: newUser };
};

const loginUser = async (userData) => {
  const { username, password } = userData;

  // tìm user theo username
  const user = await User.findOne({ where: { username } });
  if (!user) throw new Error("Username hoặc mật khẩu không đúng");

  // so sánh password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Username hoặc mật khẩu không đúng");

  // tạo token
  const tokens = generateTokens({
    userId: user.user_id,
    username: user.username,
  });

  // Lưu refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: tokens.refreshToken,
    user_id: user.user_id,
    expires_at: expiresAt,
  });

  await User.update(
    {
      activity_status: "online",
    },
    { where: { user_id: user.user_id } }
  );

  // ẩn password khi trả về
  user.password = undefined;

  return { user, tokens };
};

// Xin token mới (Refresh Token)
const refreshToken = async (refreshTokenFromClient) => {
  if (!refreshTokenFromClient) throw new Error("Chưa gửi Refresh Token");

  // check token có hợp lệ không
  let decoded;
  try {
    decoded = jwt.verify(refreshTokenFromClient, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Refresh Token hết hạn hoặc không hợp lệ.");
  }

  // 2. Kiểm tra token có trong DB không
  const savedToken = await RefreshToken.findOne({
    where: { token: refreshTokenFromClient },
  });

  if (!savedToken)
    throw new Error("Refresh Token không tồn tại trong hệ thống.");

  // 3. Kiểm tra hết hạn
  if (new Date(savedToken.expires_at) < new Date()) {
    // Xoá token hết hạn
    await RefreshToken.destroy({ where: { token_id: savedToken.token_id } });

    throw new Error("Refresh Token đã hết hạn.");
  }

  // 4. Kiểm tra user
  const user = await User.findByPk(savedToken.user_id);
  if (!user) throw new Error("Không tìm thấy người dùng.");

  // Check xong, cấp lại Access token
  const newAccessToken = jwt.sign(
    { userId: user.user_id, email: user.email },
    JWT_SECRET,
    { expiresIn: "30m" }
  );

  return { accessToken: newAccessToken };
};

// Log out
const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;

  // 1. Tìm refresh token trong DB
  const storedToken = await RefreshToken.findOne({
    where: { token: refreshToken },
  });

  if (!storedToken) {
    // token không tồn tại → coi như đã logout
    return;
  }

  const userId = storedToken.user_id;

  // 2. Update trạng thái user
  await User.update(
    { activity_status: "offline" },
    { where: { user_id: userId } }
  );

  // 3. Xóa refresh token
  await RefreshToken.destroy({
    where: { token: refreshToken },
  });

  return { message: "Log out successfully." };
};

// ADMIN PAGE
const loginAdmin = async ({ username, password }) => {
  const user = await User.findOne({ where: { username } });

  if (!user) {
    throw new Error("Username hoặc mật khẩu không đúng");
  }

  if (!["admin", "super_admin"].includes(user.role)) {
    throw new Error("Bạn không có quyền truy cập trang admin");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Username hoặc mật khẩu không đúng");
  }

  const tokens = generateTokens({
    userId: user.user_id,
    role: user.role,
    scope: "admin",
  });

  await RefreshToken.create({
    token: tokens.refreshToken,
    user_id: user.user_id,
    expires_at: new Date(Date.now() + 7 * 86400000),
  });

  user.password = undefined;

  return { admin: user, tokens };
};

const logoutAdmin = async (refreshToken) => {
  await RefreshToken.destroy({
    where: { token: refreshToken },
  });

  return { message: "Log out successfully." };
};

const refreshAdminToken = async (refreshTokenFromClient) => {
  if (!refreshTokenFromClient) {
    throw new Error("Chưa gửi Refresh Token admin");
  }

  // 1. Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshTokenFromClient, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Refresh token admin hết hạn hoặc không hợp lệ");
  }

  // 2. Check scope
  if (decoded.scope !== "admin") {
    throw new Error("Refresh token không hợp lệ cho admin");
  }

  // 3. Check DB
  const savedToken = await RefreshToken.findOne({
    where: {
      token: refreshTokenFromClient,
      user_id: decoded.userId,
    },
  });

  if (!savedToken) {
    throw new Error("Refresh token admin không tồn tại");
  }

  // 4. Check hết hạn DB
  if (new Date(savedToken.expires_at) < new Date()) {
    await RefreshToken.destroy({
      where: { token_id: savedToken.token_id },
    });

    throw new Error("Refresh token admin đã hết hạn");
  }

  // 5. Check user + role
  const user = await User.findByPk(savedToken.user_id);
  if (!user) throw new Error("Không tìm thấy admin");

  if (!["admin", "super_admin"].includes(user.role)) {
    throw new Error("Không có quyền admin");
  }

  // 6. Cấp access token mới
  const accessToken = jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
      scope: "admin",
    },
    JWT_SECRET,
    { expiresIn: "30m" }
  );

  return { accessToken };
};


module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  loginAdmin,
  logoutAdmin,
  refreshAdminToken,
};
