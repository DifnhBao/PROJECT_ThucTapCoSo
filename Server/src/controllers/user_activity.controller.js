const { ingestActivity, getRecentlyPlayed } = require('../services/user_activity.service');
const { AppError } = require('../utils/app-error');
async function logActivity(req, res, next) {
  try {
    if (!req.auth?.userId) throw new AppError('Cần đăng nhập.', 401, 'UNAUTHENTICATED');
    const result = await ingestActivity(req.auth.userId, req.body);
    return res.status(result.created ? 201 : 200).json({ ...result.activity, duplicate: !result.created });
  } catch (error) { next(error); }
}
async function getRecent(req, res, next) {
  try {
    if (!req.auth?.userId) throw new AppError('Cần đăng nhập.', 401, 'UNAUTHENTICATED');
    res.set('Cache-Control', 'private, no-store').json(await getRecentlyPlayed(req.auth.userId, req.query));
  } catch (error) { next(error); }
}
module.exports = require('../validation/validate-controller').withContracts({ logActivity, getRecent }, require('../validation/contracts').contracts.activity);
