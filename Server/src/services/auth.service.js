const { AppError } = require('../utils/app-error');
const { sequelize, User } = require('../models');
const { validatePassword } = require('../utils/passwordValidator');
const bcrypt = require('bcryptjs');
const sessions = require('./session.service');

const registerUser = async (userData) => {
  const { email, password, username } = userData;

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AppError(passwordError, 422, "INVALID_PASSWORD");
  }

  // Kiểm tra trùng username
  const existingUser = await User.findOne({
    where: { username },
  });

  if (existingUser) {
    throw new AppError("Username đã được sử dụng", 409, "USERNAME_EXISTS");
  }

  const newUser = await User.create({
    email,
    password,
    username,
  });

  newUser.password = undefined;
  return { user: newUser };
};

async function login({ username, password }, scope) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findOne({ where: { username }, transaction, lock: transaction.LOCK.UPDATE });
    if (!user || !await bcrypt.compare(password, user.password)) throw new AppError('Username hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
    if (scope === 'user' ? user.role !== 'user' : !['admin', 'super_admin'].includes(user.role)) throw new AppError('Tài khoản không có quyền đăng nhập', 403, 'FORBIDDEN');
    const tokens = await sessions.issue(user, scope, transaction);
    if (scope === 'user') await user.update({ activity_status: 'online' }, { transaction });
    const safeUser = user.toJSON();
    delete safeUser.password;
    return scope === 'user' ? { user: safeUser, tokens } : { admin: safeUser, tokens };
  });
}
module.exports = {
  registerUser,
  loginUser: (data) => login(data, 'user'),
  loginAdmin: (data) => login(data, 'admin'),
  refreshToken: (token) => sessions.rotate(token, 'user'),
  refreshAdminToken: (token) => sessions.rotate(token, 'admin'),
  logoutUser: (token) => sessions.logout(token, 'user'),
  logoutAdmin: (token) => sessions.logout(token, 'admin'),
};
