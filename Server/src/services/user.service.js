const sessions = require('./session.service');
const { AppError } = require("../utils/app-error");
const { User } = require("../models");
const bcrypt = require("bcryptjs");
const { validatePassword } = require("../utils/passwordValidator");
const { AuthorizationError, requireId, requirePermission } = require("../utils/authorization");
const { isAdmin, canManageAdmins, canResetPassword, canDeleteUser, canUpdateUserProfile } = require("../policies/user.policy");

/* --- CHỨC NĂNG DÀNH CHO USER --- */
const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");
  }

  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const { firstName, lastName, gender, dateOfBirth, phone, address } =
    updateData;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");
  }

  const emptyToNull = (v) => (v === "" ? null : v);

  user.first_name =
    firstName !== undefined ? emptyToNull(firstName) : user.first_name;

  user.last_name =
    lastName !== undefined ? emptyToNull(lastName) : user.last_name;

  user.birthday =
    dateOfBirth !== undefined ? emptyToNull(dateOfBirth) : user.birthday;

  user.gender = gender !== undefined ? emptyToNull(gender) : user.gender;

  user.phone_number =
    phone !== undefined ? emptyToNull(phone) : user.phone_number;

  user.address = address !== undefined ? emptyToNull(address) : user.address;

  await user.save();

  user.password = undefined;
  return user;
};

const updateUserAvatar = async (userId, avatarUrl) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  user.avatar = avatarUrl;
  return await user.save();
};

const changeUserPassword = async (userId, oldPassword, newPassword) => {
  if (typeof oldPassword !== "string" || typeof newPassword !== "string" || !oldPassword || !newPassword) {
    throw new AuthorizationError("Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.", 400, "PASSWORD_REQUIRED");
  }
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new AuthorizationError("Mật khẩu cũ không chính xác.");
  }

  if (oldPassword === newPassword) {
    throw new AppError("Mật khẩu mới không được trùng với mật khẩu cũ.", 422, "PASSWORD_REUSED");
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new AppError(passwordError, 422, "INVALID_PASSWORD");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await sessions.saveSecurityChange(user);

  return {
    message: "Đổi mật khẩu thành công",
  };
};

/* --- CHỨC NĂNG DÀNH CHO ADMIN --- */

const getCurrentAdmin = async (adminId) => {
  const admin = await User.findByPk(adminId, {
    attributes: { exclude: ["password"] },
  });

  if (!admin) {
    throw new AppError("Không tìm thấy quản trị viên.", 404, "USER_NOT_FOUND");
  }

  return admin;
};

const promoteUserToAdmin = async (userIdToPromote, requester) => {
  userIdToPromote = requireId(userIdToPromote);
  requirePermission(canManageAdmins(requester));

  const user = await User.findByPk(userIdToPromote);
  if (!user) throw new AppError("Không tìm thấy ID này!!!", 404, "USER_NOT_FOUND");
  requirePermission(user.role === "user" && user.user_id !== requester.userId);

  user.role = "admin";
  await sessions.saveSecurityChange(user);

  user.password = undefined;
  return user;
};

const demoteAdminToUser = async (userIdToDemote, requester) => {
  userIdToDemote = requireId(userIdToDemote);
  requirePermission(canManageAdmins(requester) && userIdToDemote !== requester.userId);

  const user = await User.findByPk(userIdToDemote);
  if (!user) {
    throw new AppError("Không tìm thấy user này.", 404, "USER_NOT_FOUND");
  }

  requirePermission(user.role === "admin");

  user.role = "user";
  await sessions.saveSecurityChange(user);

  return user;
};

// Lấy danh sách người dùng
const getAllUsers = async () => {
  const users = await User.findAll({
    where: {
      role: "user",
    },
    attributes: {
      exclude: ["password"],
    },
  });

  return users;
};

// lấy danh sách admin
const getAdminsAndSuperAdmins = async () => {
  const admins = await User.findAll({
    where: {
      role: ["admin", "super_admin"],
    },
    attributes: {
      exclude: ["password"],
    },
    order: [["created_at", "DESC"]],
  });

  return admins;
};

// Lấy thông tin user theo ID
const adminGetUserById = async (userId, requester) => {
  requirePermission(isAdmin(requester));
  userId = requireId(userId);
  const user = await User.findByPk(userId, {
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
  }

  return user;
};

// Cập nhật thông tin user theo ID
const updateUserById = async (userId, updateData, requester) => {
  requirePermission(isAdmin(requester));
  userId = requireId(userId);
  const { firstName, lastName, gender, dateOfBirth, address, phone } =
    updateData;

  const user = await User.findByPk(userId);
  if (!user) throw new AppError("Không tìm thấy người dùng.", 404, "USER_NOT_FOUND");

  requirePermission(canUpdateUserProfile(requester, user));

  for (const [field, value] of Object.entries({ first_name: firstName, last_name: lastName, gender, birthday: dateOfBirth, address, phone_number: phone })) {
    if (value !== undefined) user[field] = value === '' ? null : value;
  }

  await user.save();

  user.password = undefined;
  return user;
};

const deleteUserById = async (userIdToDelete, requester) => {
  userIdToDelete = requireId(userIdToDelete);
  requirePermission(isAdmin(requester));

  // 1. Không được xóa chính mình
  if (userIdToDelete === requester.userId) {
    throw new AuthorizationError("Bạn không thể tự xóa tài khoản của chính mình.");
  }

  // 2. Kiểm tra user cần xóa
  const user = await User.findByPk(userIdToDelete);
  if (!user) {
    throw new AppError("Người dùng không tồn tại.", 404, "USER_NOT_FOUND");
  }

  requirePermission(canDeleteUser(requester, user));

  // 4. Thực hiện xóa
  await user.destroy();

  return {
    message: `Đã xóa thành công tài khoản ${user.username}`,
  };
};

const resetUserPassword = async (userId, newPassword, requester) => {
  userId = requireId(userId);
  requirePermission(isAdmin(requester));
  const targetUser = await User.findByPk(userId);
  if (!targetUser) {
    throw new AppError("Không tìm thấy user này.", 404, "USER_NOT_FOUND");
  }

  requirePermission(canResetPassword(requester, targetUser));
  if (typeof newPassword !== "string") {
    throw new AuthorizationError("Mật khẩu mới không hợp lệ.", 400, "INVALID_PASSWORD");
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    throw new AppError(passwordError, 422, "INVALID_PASSWORD");
  }

  // ===== UPDATE PASSWORD =====
  const salt = await bcrypt.genSalt(10);
  targetUser.password = await bcrypt.hash(newPassword, salt);
  await sessions.saveSecurityChange(targetUser);

  return {
    message: `Đã đặt lại mật khẩu cho user ${targetUser.username} thành công.`,
  };
};

// Thêm mới tài khoản admin
const createAdminAccount = async ({ username, email, password }, requester) => {
  requirePermission(canManageAdmins(requester));
  // 1. Check trùng username
  const existedUser = await User.findOne({
    where: { username },
  });

  if (existedUser) {
    throw new AppError("Username đã tồn tại", 409, "USERNAME_EXISTS");
  }

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AppError(passwordError, 422, "INVALID_PASSWORD");
  }

  // 2. Tạo admin
  const newAdmin = await User.create({
    username,
    email,
    password,
    role: "admin",
    // account_status: "actived",
  });

  newAdmin.password = undefined;

  return { user: newAdmin };
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  changeUserPassword,
  promoteUserToAdmin,
  getAllUsers,
  updateUserById,
  deleteUserById,
  demoteAdminToUser,
  resetUserPassword,
  getCurrentAdmin,
  adminGetUserById,
  getAdminsAndSuperAdmins,
  createAdminAccount,
};
