const { randomBytes, randomUUID, createHash, createHmac } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, RefreshToken } = require('../models');
const { AppError } = require('../utils/app-error');

const ACCESS_TTL_MS = 30 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_GRACE_MS = 10000;
const digest = (token) => createHash('sha256').update(token).digest('hex');
const invalid = () => new AppError('Phiên đã hết hạn hoặc bị thu hồi.', 401, 'INVALID_SESSION');
const validRole = (role, scope) => scope === 'user' ? role === 'user' : scope === 'admin' && ['admin', 'super_admin'].includes(role);
const validToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

function tokens(user, row, refreshToken) {
  const remaining = new Date(row.expires_at).getTime() - Date.now();
  if (remaining <= 0) throw invalid();
  const accessTtl = Math.min(ACCESS_TTL_MS, remaining);
  return {
    accessToken: jwt.sign({ userId: user.user_id, role: user.role, scope: row.scope, sessionId: row.family_id }, process.env.JWT_SECRET, { expiresIn: Math.max(1, Math.floor(accessTtl / 1000)) }),
    refreshToken,
    accessExpiresIn: Math.floor(accessTtl / 1000) * 1000,
    refreshExpiresAt: new Date(row.expires_at),
  };
}

async function issue(user, scope, transaction) {
  const raw = randomBytes(32).toString('base64url');
  const row = await RefreshToken.create({ user_id: user.user_id, token: digest(raw), family_id: randomUUID(), scope, expires_at: new Date(Date.now() + REFRESH_TTL_MS) }, { transaction });
  return tokens(user, row, raw);
}

async function rotate(raw, scope) {
  if (!validToken(raw)) throw invalid();
  const tokenDigest = digest(raw);
  // Discover owner without locks, then always lock owner BEFORE token rows.
  const hint = await RefreshToken.findOne({ where: { token: tokenDigest, scope }, attributes: ['user_id'] });
  if (!hint) throw invalid();
  const outcome = await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(hint.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || !validRole(user.role, scope)) throw invalid();
    const row = await RefreshToken.findOne({ where: { token: tokenDigest, scope, user_id: user.user_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) throw invalid();
    // A keyed PRF permits replaying exactly the committed result without persisting raw credentials.
    const nextRaw = createHmac('sha256', process.env.JWT_REFRESH_SECRET).update(`refresh-v1:${row.family_id}:${raw}`).digest('base64url');
    if (row.consumed_at) {
      if (Date.now() - new Date(row.consumed_at).getTime() <= RETRY_GRACE_MS) {
        const successor = await RefreshToken.findOne({ where: { token: row.replacement_digest, family_id: row.family_id, scope }, transaction, lock: transaction.LOCK.UPDATE });
        if (successor && !successor.consumed_at && !successor.revoked_at && digest(nextRaw) === successor.token) return tokens(user, successor, nextRaw);
        throw new AppError('Refresh đã được xử lý; thử lại yêu cầu gốc.', 409, 'REFRESH_CONFLICT');
      }
      await RefreshToken.update({ revoked_at: new Date() }, { where: { family_id: row.family_id, user_id: user.user_id }, transaction });
      // Return error, rather than throw, so family revocation COMMITs.
      return { error: invalid() };
    }
    await row.update({ consumed_at: new Date(), replacement_digest: digest(nextRaw) }, { transaction });
    const successor = await RefreshToken.create({ token: digest(nextRaw), family_id: row.family_id, scope, user_id: user.user_id, expires_at: row.expires_at }, { transaction });
    return tokens(user, successor, nextRaw);
  });
  if (outcome.error) throw outcome.error;
  return outcome;
}

async function logout(raw, scope) {
  if (!validToken(raw)) return;
  const hint = await RefreshToken.findOne({ where: { token: digest(raw), scope } });
  if (!hint) return;
  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(hint.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return;
    await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.user_id, family_id: hint.family_id, scope }, transaction });
    if (scope === 'user') {
      const remaining = await RefreshToken.count({ where: { user_id: user.user_id, scope, consumed_at: null, revoked_at: null, expires_at: { [Op.gt]: new Date() } }, transaction });
      if (!remaining) await user.update({ activity_status: 'offline' }, { transaction });
    }
  });
}

async function validateAccessSession(principal) {
  if (!principal.sessionId || !/^[0-9a-f-]{36}$/.test(principal.sessionId)) throw invalid();
  const row = await RefreshToken.findOne({
    where: { user_id: principal.userId, family_id: principal.sessionId, scope: principal.scope, revoked_at: null, consumed_at: null, expires_at: { [Op.gt]: new Date() } },
    include: [{ model: User, as: 'user', required: true, attributes: ['role'], where: { role: principal.role } }],
  });
  if (!row) throw invalid();
}

// Password/role changes and session revocation must be one atomic commit.
async function saveSecurityChange(user) {
  return sequelize.transaction(async (transaction) => {
    const current = await User.findByPk(user.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current || current.password !== user.previous('password') || current.role !== user.previous('role')) {
      throw new AppError('Tài khoản vừa thay đổi; tải lại rồi thử lại.', 409, 'SECURITY_STATE_CHANGED');
    }
    await user.save({ transaction });
    await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.user_id, revoked_at: null }, transaction });
  });
}

module.exports = { issue, rotate, logout, validateAccessSession, saveSecurityChange, digest, ACCESS_TTL_MS, REFRESH_TTL_MS, RETRY_GRACE_MS };
