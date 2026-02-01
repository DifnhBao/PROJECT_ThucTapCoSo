const { User } = require("../models");
const userService = require("../services/user.service");

/* --- Controller for User */

const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const user = await userService.getUserProfile(userId);

    res.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const updateData = req.body;
    const updatedUser = await userService.updateUserProfile(userId, updateData);

    res.status(200).json({
      message: "Cập nhật thông tin thành công",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const changeUserPassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new Error("Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.");
    }

    const result = await userService.changeUserPassword(
      userId,
      oldPassword,
      newPassword
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* Controller for Admin */

const getCurrentAdmin = async (req, res) => {
  const adminId = req.user.userId;
  const admin = await userService.getCurrentAdmin(adminId);
  res.json({ admin });
};

const promoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.user_id;

    const updateUser = await userService.promoteUserToAdmin(id, requesterId);

    res.status(200).json({
      message: `Đã nâng quyền Admin cho user ${updateUser.username}!!!`,
      data: updateUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const demoteAdminToUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.user_id;

    const result = await userService.demoteAdminToUser(id, requesterId);
    res.status(200).json({
      message: `Đã hạ quyền tài khoản ${result.username} thành user.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách tất cả user
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// lấy danh sach tất cả admin
const getAllAdmins = async (req, res, next) => {
  try {
    const admins = await userService.getAdminsAndSuperAdmins();

    res.status(200).json({
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy thông tin user theo ID
const getUserProfileByAdmin = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await userService.adminGetUserById(userId);

    res.status(200).json({
      message: "Lấy thông tin user thành công",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Cập nhật thông tin user theo ID
const updateUserById = async (req, res, next) => {
  try {
    const { id } = req.params; // Lay ID tu URL
    const updateData = req.body;
    // const requesterId = req.user.user_id;

    const updatedUser = await userService.updateUserById(
      id,
      updateData
      //   requesterId
    );
    res.status(200).json({
      message: "Admin cập nhật thông tin user thành công.",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi hệ thống." });
  }
};

const deleteUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requester = req.user;

    const result = await userService.deleteUserById(id, requester);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requester = req.user;

    if (!newPassword) {
      throw new Error("Vui lòng nhập mật khẩu mới.");
    }

    const result = await userService.resetUserPassword(
      id,
      newPassword,
      requester
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addNewAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email và password là bắt buộc",
      });
    }

    const admin = await userService.createAdminAccount({
      username,
      email,
      password,
    });

    return res.status(201).json({
      message: "Thêm mới tài khoản quản trị viên thành công",
      data: admin,
    });
  } catch (err) {
    console.error("Create admin error:", err.message);
    return res.status(400).json({
      message: err.message || "Không thể tạo tài khoản admin",
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  promoteUser,
  getAllUsers,
  updateUserById,
  deleteUserById,
  demoteAdminToUser,
  resetUserPassword,
  getCurrentAdmin,
  getUserProfileByAdmin,
  getAllAdmins,
  addNewAdmin,
};
