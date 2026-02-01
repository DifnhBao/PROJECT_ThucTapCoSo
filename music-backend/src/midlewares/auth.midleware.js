const jwt = require("jsonwebtoken");
const { User } = require("../models");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  try {
    let token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null);
    // token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Không tìm thấy token!" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!req.user) {
      return res.status(401).json({ message: "Người dùng không tồn tại!" });
    }
    next();
  } catch (error) {
    console.error("Lỗi khi xác minh JWT:", error);
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

const isAdmin = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Can't access!" });
  }
};

const protectAdmin = async (req, res, next) => {
  const token = req.cookies.adminAccessToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!["admin", "super_admin"].includes(decoded.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = decoded;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Can't access!" });
    }

    next();
  };
};

module.exports = { protect, isAdmin, protectAdmin, authorizeRoles };
