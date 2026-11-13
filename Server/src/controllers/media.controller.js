const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { MediaAsset, Song, User } = require('../models');
const { optionalAuth } = require('../midlewares/auth.midleware');
const { isAdmin } = require('../policies/user.policy');
const { AppError } = require('../utils/app-error');
const storage = require('../storage/cloudinary');

exports.readMedia = async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/.test(req.params.assetId)) throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
    const asset = await MediaAsset.findByPk(req.params.assetId);
    if (!asset || asset.state !== 'owned') throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
    if (asset.song_id) {
      const song = await Song.findByPk(asset.song_id);
      if (!song) throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
      if (!(song.status === 'approved' && song.is_visible)) {
        // Public playback does not require a login, even with an expired stray
        // cookie. Private preview explicitly validates the current admin session.
        await new Promise((resolve, reject) => optionalAuth(req, res, (error) => error ? reject(error) : resolve()));
        if (!isAdmin(req.auth)) throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
      }
    } else if (asset.avatar_user_id) {
      const user = await User.findByPk(asset.avatar_user_id);
      if (!user || user.avatar !== `/api/media/${asset.id}`) throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
    } else throw new AppError('Không tìm thấy media.', 404, 'MEDIA_NOT_FOUND');
    const range = req.get('Range');
    if (range && !/^bytes=\d+-\d*$/.test(range)) throw new AppError('Range không hợp lệ.', 416, 'INVALID_RANGE');
    const upstream = await storage.read(asset, range);
    if (![200, 206].includes(upstream.status) || !upstream.body) {
      await upstream.body?.cancel();
      throw new AppError('Media tạm thời chưa sẵn sàng.', upstream.status === 416 ? 416 : 502, 'MEDIA_UNAVAILABLE');
    }
    res.status(upstream.status).set({ 'Cache-Control': 'private, no-store', 'Content-Type': { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', png: 'image/png', jpg: 'image/jpeg' }[asset.format] || 'application/octet-stream' });
    for (const header of ['content-length', 'content-range', 'accept-ranges']) if (upstream.headers.has(header)) res.set(header, upstream.headers.get(header));
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    if (res.headersSent) {
      console.error(JSON.stringify({ event: 'media_stream_failed', requestId: req.requestId }));
      res.destroy();
    } else next(error);
  }
};
