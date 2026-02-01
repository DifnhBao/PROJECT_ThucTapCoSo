const { User } = require("../models");
const bcrypt = require("bcryptjs");

/* --- CHỨC NĂNG DÀNH CHO USER --- */
const getUserProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const { firstName, lastName, gender, dateOfBirth, phone, address } =
    updateData;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
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

const changeUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("Không tìm thấy người dùng.");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error("Mật khẩu cũ không chính xác.");
  }

  if (oldPassword === newPassword) {
    throw new Error("Mật khẩu mới không được trùng với mật khẩu cũ.");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

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
    throw new Error("Không tìm thấy quản trị viên.");
  }

  return admin;
};

const promoteUserToAdmin = async (userIdToPromote, requesterId) => {
  if (requesterId !== 2) {
    throw new Error("Bạn không có quyền của Super Admin để promote.");
  }

  const user = await User.findByPk(userIdToPromote);
  if (!user) throw new Error("Không tìm thấy ID này!!!");
  if (user.role === "admin") throw new Error("ID đã có quyền admin!!!");

  user.role = "admin";
  await user.save();

  user.password = undefined;
  return user;
};

const demoteAdminToUser = async (userIdToDemote, requesterId) => {
  if (userIdToDemote === requesterId) {
    throw new Error("Bạn không thể hạ quyền của chính mình!");
  }

  if (requesterId !== 2) {
    throw new Error("Bạn không có quyền Super Admin để demote.");
  }

  const user = await User.findByPk(userIdToDemote);
  if (!user) {
    throw new Error("Không tìm thấy user này.");
  }

  if (user.role === "user") {
    throw new Error("Nguời dùng này đã là user thường rồi.");
  }

  user.role = "user";
  await user.save();

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
const adminGetUserById = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
};

// Cập nhật thông tin user theo ID
const updateUserById = async (userId, updateData) => {
  const { firstName, lastName, gender, dateOfBirth, address, phone } =
    updateData;

  const user = await User.findByPk(userId);
  if (!user) throw new Error("Không tìm thấy người dùng.");

  if (user.role !== "user") {
    throw new Error("Chỉ được phép chỉnh sửa thông tin người dùng.");
  }

  user.first_name = firstName ?? user.first_name;
  user.last_name = lastName ?? user.last_name;
  user.gender = gender ?? user.gender;
  user.birthday = dateOfBirth ?? user.birthday;
  user.address = address ?? user.address;
  user.phone_number = phone ?? user.phone_number;

  await user.save();

  user.password = undefined;
  return user;
};

const deleteUserById = async (userIdToDelete, requester) => {
  const { user_id: requesterId, role: requesterRole } = requester;

  // 1. Không được xóa chính mình
  if (userIdToDelete === requesterId) {
    throw new Error("Bạn không thể tự xóa tài khoản của chính mình.");
  }

  // 2. Kiểm tra user cần xóa
  const user = await User.findByPk(userIdToDelete);
  if (!user) {
    throw new Error("Người dùng không tồn tại.");
  }

  const targetRole = user.role;

  // 3. Phân quyền
  if (requesterRole === "admin") {
    if (targetRole !== "user") {
      throw new Error("Admin chỉ được phép xóa người dùng thường.");
    }
  }

  if (requesterRole === "super_admin") {
    if (targetRole === "super_admin") {
      throw new Error(
        "Super Admin không thể xóa chính mình hoặc Super Admin khác."
      );
    }
    // xóa admin & user OK
  }

  // 4. Thực hiện xóa
  await user.destroy();

  return {
    message: `Đã xóa thành công tài khoản ${user.username}`,
  };
};

const resetUserPassword = async (userId, newPassword, requester) => {
  const targetUser = await User.findByPk(userId);
  if (!targetUser) {
    throw new Error("Không tìm thấy user này.");
  }

  const isSelf = targetUser.id === requester.user_id;
  const requesterRole = requester.role;
  const targetRole = targetUser.role;

  // ===== SUPER ADMIN =====
  if (requesterRole === "super_admin") {
    if (!isSelf && targetRole === "super_admin") {
      throw new Error("Không thể đặt lại mật khẩu cho Super Admin khác.");
    }
  }

  // ===== ADMIN =====
  else if (requesterRole === "admin") {
    // admin đổi mật khẩu chính mình
    if (isSelf) {
      // OK
    }
    // admin đổi mật khẩu user thường
    else if (targetRole === "user") {
      // OK
    } else {
      throw new Error("Admin không có quyền đặt lại mật khẩu cho role này.");
    }
  }

  // ===== ROLE KHÁC =====
  else {
    throw new Error("Bạn không có quyền đặt lại mật khẩu.");
  }

  // ===== UPDATE PASSWORD =====
  const salt = await bcrypt.genSalt(10);
  targetUser.password = await bcrypt.hash(newPassword, salt);
  await targetUser.save();

  return {
    message: `Đã đặt lại mật khẩu cho user ${targetUser.username} thành công.`,
  };
};

// Thêm mới tài khoản admin
const createAdminAccount = async ({ username, email, password }) => {
  // 1. Check trùng username
  const existedUser = await User.findOne({
    where: { username },
  });

  if (existedUser) {
    throw new Error("Username đã tồn tại");
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
