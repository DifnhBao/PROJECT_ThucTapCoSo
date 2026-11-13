const { User } = require('../models');
const { AppError } = require('../utils/app-error');
module.exports = (needsProfile = false) => async (req, res, next) => {
  try {
    const key = req.get('Idempotency-Key');
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new AppError('Cần Idempotency-Key hợp lệ.', 400, 'IDEMPOTENCY_KEY_REQUIRED');
    const user = await User.findByPk(req.auth.userId);
    if (!user || user.role !== req.auth.role) throw new AppError('Phiên không còn hợp lệ.', 401, 'INVALID_SESSION');
    if (needsProfile && (!user.first_name || !user.last_name)) throw new AppError('Vui lòng cập nhật họ tên trong hồ sơ trước khi upload.', 403, 'PROFILE_REQUIRED');
    next();
  } catch (error) { next(error); }
};
