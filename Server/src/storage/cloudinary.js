const cloud = require('cloudinary').v2;
const { AppError } = require('../utils/app-error');
function configure() {
  cloud.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
}
module.exports = {
  async upload(filename, asset) {
    configure();
    await cloud.uploader.upload(filename, { public_id: asset.public_id, resource_type: asset.resource_type, type: asset.delivery_type, overwrite: false, timeout: 60000 });
  },
  async destroy(asset) {
    configure();
    const result = await cloud.uploader.destroy(asset.public_id, { resource_type: asset.resource_type, type: asset.delivery_type, invalidate: true, timeout: 60000 });
    if (!['ok', 'not found'].includes(result.result)) throw new Error('Asset cleanup was not confirmed');
  },
  async read(asset, range, { signal, headerTimeoutMs = 30000 } = {}) {
    configure();
    const url = cloud.utils.private_download_url(asset.public_id, asset.format, { resource_type: asset.resource_type, type: asset.delivery_type, expires_at: Math.floor(Date.now() / 1000) + 120, attachment: false });
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), headerTimeoutMs);
    try {
      return await fetch(url, {
        headers: range ? { Range: range } : {},
        signal: signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal,
        redirect: 'error',
      });
    } catch (error) {
      if (deadline.signal.aborted) throw new AppError('Media tạm thời chưa sẵn sàng.', 502, 'MEDIA_UNAVAILABLE');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },
};
