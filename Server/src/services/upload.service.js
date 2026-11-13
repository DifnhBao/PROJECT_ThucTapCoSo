const { randomUUID, createHash } = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize, User, UploadReceipt, MediaAsset } = require('../models');
const songs = require('./song.service');
const storage = require('../storage/cloudinary');
const files = require('./upload-files');
const { AppError } = require('../utils/app-error');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const event = (name, req) => console.error(JSON.stringify({ event: name, requestId: req?.requestId }));

async function cleanupAsset(asset, req) {
  try {
    await storage.destroy(asset);
    await asset.update({ state: 'cleaned' });
  } catch {
    event('asset_cleanup_pending', req);
    try { await asset.update({ state: 'cleanup_pending' }); }
    catch { event('asset_cleanup_record_unavailable', req); } // Planned descriptor remains durable for recovery.
  }
}
async function execute(req, kind = 'song') {
  let receipt, assets = [], committed = false;
  try {
    const slots = kind === 'song' ? [['audio', req.files?.audioFile?.[0]], ['image', req.files?.imageFile?.[0]]] : [['avatar', req.file]];
    const inspected = [];
    for (const [slot, file] of slots) {
      if (!file && slot === 'image') continue;
      inspected.push({ slot, file, ...await files.inspect(file, slot === 'audio' ? 'audio' : 'image') });
    }
    const metadata = { title: req.body.title, artist: req.body.artist, genre: req.body.genre, duration: req.body.duration };
    const payload = digest(JSON.stringify({ kind, scope: req.auth.scope, metadata, files: inspected.map(({ slot, digest: hash }) => ({ slot, hash })) }));
    const key = digest(req.get('Idempotency-Key'));
    const reserved = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.auth.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user || user.role !== req.auth.role) throw new AppError('Phiên không còn hợp lệ.', 401, 'INVALID_SESSION');
      if (kind === 'song' && req.auth.scope === 'user' && (!user.first_name || !user.last_name)) throw new AppError('Vui lòng cập nhật hồ sơ.', 403, 'PROFILE_REQUIRED');
      const existing = await UploadReceipt.findOne({ where: { user_id: user.user_id, key_digest: key }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) {
        if (existing.payload_digest !== payload) throw new AppError('Key đã dùng với nội dung khác.', 409, 'IDEMPOTENCY_CONFLICT');
        if (existing.status === 'completed') return { replay: existing.response };
        if (existing.status === 'processing') throw new AppError('Upload đang được xử lý; thử lại sau.', 409, 'UPLOAD_IN_PROGRESS');
        const pending = await MediaAsset.count({ where: { receipt_id: existing.id, state: { [Op.notIn]: ['cleaned', 'owned'] } }, transaction });
        if (pending) throw new AppError('Đang chờ dọn upload trước; thử lại sau.', 409, 'UPLOAD_CLEANUP_PENDING');
        await existing.update({ status: 'processing' }, { transaction });
        return { receipt: existing, username: user.username };
      }
      return { receipt: await UploadReceipt.create({ user_id: user.user_id, key_digest: key, payload_digest: payload, status: 'processing' }, { transaction }), username: user.username };
    });
    if (reserved.replay) return { data: reserved.replay, replayed: true };
    receipt = reserved.receipt;
    // Durable planned IDs are written BEFORE provider side effects, including ambiguous timeouts.
    for (const item of inspected) {
      const id = randomUUID();
      const asset = await MediaAsset.create({ id, receipt_id: receipt.id, public_id: `tunetrek/${id}`, resource_type: item.slot === 'audio' ? 'video' : 'image', delivery_type: 'authenticated', format: item.format, state: 'planned' });
      assets.push(asset);
      await storage.upload(item.file.path, asset);
      item.asset = asset;
    }
    const response = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.auth.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user || user.role !== req.auth.role) throw new AppError('Quyền upload đã thay đổi.', 403, 'FORBIDDEN');
      const locked = await UploadReceipt.findByPk(receipt.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (locked.status !== 'processing') throw new AppError('Upload đã được thu hồi.', 409, 'UPLOAD_CONFLICT');
      let result;
      if (kind === 'song') {
        if (req.auth.scope === 'user' && (!user.first_name || !user.last_name)) throw new AppError('Vui lòng cập nhật hồ sơ.', 403, 'PROFILE_REQUIRED');
        const bySlot = Object.fromEntries(inspected.map((item) => [item.slot, `/api/media/${item.asset.id}`]));
        const song = await songs.createSong({ ...metadata, artist: metadata.artist || reserved.username, status: req.auth.scope === 'user' ? 'pending' : 'approved', uploaded_by: user.user_id, audio_url: bySlot.audio, image_url: bySlot.image || null }, { transaction });
        await MediaAsset.update({ state: 'owned', song_id: song.song_id }, { where: { id: assets.map((a) => a.id) }, transaction });
        result = song.toJSON();
      } else {
        const avatar = `/api/media/${assets[0].id}`;
        const prior = await MediaAsset.findAll({ where: { avatar_user_id: user.user_id, state: 'owned' }, transaction });
        await user.update({ avatar }, { transaction });
        await MediaAsset.update({ state: 'owned', avatar_user_id: user.user_id }, { where: { id: assets[0].id }, transaction });
        for (const old of prior) await old.update({ state: 'cleanup_pending', avatar_user_id: null }, { transaction });
        result = { avatar };
      }
      await locked.update({ status: 'completed', response: result }, { transaction });
      return result;
    });
    committed = true;
    // No post-commit hydrate/read in the compensation block. DTO+receipt committed together.
    return { data: response, replayed: false };
  } catch (error) {
    if (receipt && !committed) {
      // A commit acknowledgement can be lost. Never destroy potentially committed assets.
      let persisted;
      try { persisted = await UploadReceipt.findByPk(receipt.id); }
      catch { event('upload_commit_state_unknown', req); throw new AppError('Chưa xác định trạng thái upload; retry cùng key.', 503, 'UPLOAD_STATE_UNKNOWN'); }
      if (persisted?.status === 'completed') return { data: persisted.response, replayed: true };
      for (const asset of assets) await cleanupAsset(asset, req);
      try { await receipt.update({ status: 'failed' }); } catch { event('upload_recovery_required', req); }
    }
    throw error;
  } finally { await files.cleanup(req); }
}

async function retryCleanup({ recoverStale = false } = {}) {
  if (recoverStale) {
    // Operator must stop upload writers before recovering processing receipts.
    const stale = await UploadReceipt.findAll({ where: { status: 'processing', updated_at: { [Op.lt]: new Date(Date.now() - 30 * 60000) } }, limit: 100 });
    for (const receipt of stale) await sequelize.transaction(async (transaction) => {
      await receipt.update({ status: 'failed' }, { transaction });
      await MediaAsset.update({ state: 'cleanup_pending' }, { where: { receipt_id: receipt.id, state: 'planned' }, transaction });
    });
    await MediaAsset.update({ state: 'cleanup_pending' }, { where: { state: 'planned', receipt_id: null } });
  }
  const pending = await MediaAsset.findAll({ where: { [Op.or]: [{ state: 'cleanup_pending' }, { state: 'owned', song_id: null, avatar_user_id: null }] }, limit: 100 });
  for (const asset of pending) await cleanupAsset(asset);
  return { attempted: pending.length, pending: await MediaAsset.count({ where: { state: 'cleanup_pending' } }) };
}
module.exports = { execute, cleanupAsset, retryCleanup };
