const authService = require("../services/auth.service");

const register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    const result = await authService.registerUser({
      email,
      password,
      username,
    });

    res.status(201).json({
      message: "Register successfully!",
      data: result,
    });
  } catch (error) {
    console.log(error.errors);
    res.status(400).json({
      message: error.message,
      errors: error.errors,
    });
  }
};

const ACCESS_TOKEN_TTL = 30 * 60 * 1000;
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const result = await authService.loginUser({ username, password });

    res.cookie("accessToken", result.tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: ACCESS_TOKEN_TTL,
    });

    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.status(200).json({
      message: "Login successfully!",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Login failed",
    });
  }
};

const requestRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const result = await authService.refreshToken(refreshToken);

    // Nếu muốn set lại cookie access token tại đây:
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Refresh token thành công",
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(403).json({ message: error.message });
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({
        message: "Already logged out",
      });
    }

    await authService.logoutUser(refreshToken);

    // xóa cookie
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).json({
      message: "Log out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN PAGE
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await authService.loginAdmin({ username, password });

    res.cookie("adminAccessToken", result.tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: ACCESS_TOKEN_TTL,
    });

    res.cookie("adminRefreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.status(200).json({
      message: "Admin login successfully",
      admin: result.admin,
    });
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    const adminRefreshToken = req.cookies.adminRefreshToken;

    // Xóa refresh token trong DB (nếu có)
    if (adminRefreshToken) {
      await authService.logoutAdmin(adminRefreshToken);
    }

    // Xóa cookie admin
    res.clearCookie("adminAccessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.clearCookie("adminRefreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({
      message: "Admin logout successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Admin logout failed",
    });
  }
};

const refreshAdminToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.adminRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Thiếu refresh token admin",
      });
    }

    const result = await authService.refreshAdminToken(refreshToken);

    res.cookie("adminAccessToken", result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000, // 30 phút
    });

    return res.status(200).json({
      message: "Refresh admin token thành công",
    });
  } catch (error) {
    console.error("Admin refresh token error:", error);
    return res.status(403).json({
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  requestRefreshToken,
  logout,
  loginAdmin,
  logoutAdmin,
  refreshAdminToken,
};
