const { AppError } = require('../utils/app-error');
const { User } = require("../models");
const userService = require("../services/user.service");
const uploads = require('../services/upload.service');

/* --- Controller for User */

const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const user = await userService.getUserProfile(userId);

    res.status(200).json({
      message: "Lấy thông tin user thành công",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
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

const uploadAvatar = async (req, res, next) => {
  try {
    const result = await uploads.execute(req, 'avatar');
    res.set('Idempotency-Replayed', String(result.replayed));
    res.json({ message: 'Cập nhật Avatar thành công!', ...result.data });
  } catch (error) { next(error); }
};

const changeUserPassword = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new AppError("Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.", 400, 'PASSWORD_REQUIRED');
    }

    const result = await userService.changeUserPassword(
      userId,
      oldPassword,
      newPassword,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/* Controller for Admin */

const promoteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requester = req.auth;

    const updateUser = await userService.promoteUserToAdmin(id, requester);

    res.status(200).json({
      message: `Đã nâng quyền Admin cho user ${updateUser.username}!!!`,
      data: updateUser,
    });
  } catch (error) {
    next(error);
  }
};

const demoteAdminToUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requester = req.auth;

    const result = await userService.demoteAdminToUser(id, requester);
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
    const user = await userService.adminGetUserById(userId, req.auth);

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

    const updatedUser = await userService.updateUserById(
      id,
      updateData,
      req.auth,
    );
    res.status(200).json({
      message: "Admin cập nhật thông tin user thành công.",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requester = req.auth;

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
    const requester = req.auth;

    if (!newPassword) {
      throw new AppError("Vui lòng nhập mật khẩu mới.", 400, 'PASSWORD_REQUIRED');
    }

    const result = await userService.resetUserPassword(
      id,
      newPassword,
      requester,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addNewAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new AppError("Username, email và password là bắt buộc", 400, 'VALIDATION_ERROR');
    }

    const admin = await userService.createAdminAccount({
      username,
      email,
      password,
    }, req.auth);

    return res.status(201).json({
      message: "Thêm mới tài khoản quản trị viên thành công",
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  changeUserPassword,
  promoteUser,
  getAllUsers,
  updateUserById,
  deleteUserById,
  demoteAdminToUser,
  resetUserPassword,
  getUserProfileByAdmin,
  getAllAdmins,
  addNewAdmin,
};

module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.users);
