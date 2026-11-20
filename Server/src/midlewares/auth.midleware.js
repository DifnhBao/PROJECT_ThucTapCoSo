const sessions = require('../services/session.service');
const jwt = require('jsonwebtoken');
const { principalFromClaims } = require('../utils/authorization');
const { AppError } = require('../utils/app-error');

function accessToken(req, scope) {
  const primary = scope === 'admin' ? 'accessToken_admin' : 'accessToken';
  const secondary = scope === 'admin' ? 'accessToken' : 'accessToken_admin';
  return req.cookies?.[primary] || req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1] || req.cookies?.[secondary];
}
function principal(token) {
  if (!token) throw new AppError('Chưa đăng nhập.', 401, 'AUTH_REQUIRED');
  try { return principalFromClaims(jwt.verify(token, process.env.JWT_SECRET)); }
  catch { throw new AppError('Token không hợp lệ hoặc hết hạn.', 401, 'INVALID_TOKEN'); }
}
const protectScope = (scope) => async (req, res, next) => {
  try {
    req.auth = principal(accessToken(req, scope));
    if (req.auth.scope !== scope) throw new AppError('Không có quyền truy cập.', 403, 'FORBIDDEN');
    await sessions.validateAccessSession(req.auth);
    next();
  } catch (error) { next(error); }
};
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.auth) return next(new AppError('Chưa đăng nhập.', 401, 'AUTH_REQUIRED'));
  if (!roles.includes(req.auth.role)) return next(new AppError('Không có quyền truy cập.', 403, 'FORBIDDEN'));
  next();
};
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.accessToken_admin || accessToken(req, 'user');
  if (!token) return next();
  try { req.auth = principal(token); await sessions.validateAccessSession(req.auth); next(); } catch (error) { next(error); }
};
module.exports = { protect: protectScope('user'), protectAdmin: protectScope('admin'), authorizeRoles, optionalAuth };
