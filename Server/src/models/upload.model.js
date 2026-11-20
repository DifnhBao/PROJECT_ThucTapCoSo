const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const schema = require('../../database/upload-schema.cjs')(DataTypes);
const options = (tableName) => ({ tableName, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
module.exports = {
  UploadReceipt: sequelize.define('UploadReceipt', schema.upload_receipts, { ...options('upload_receipts'), indexes: [{ unique: true, fields: ['user_id', 'key_digest'], name: 'upload_user_key' }] }),
  MediaAsset: sequelize.define('MediaAsset', schema.media_assets, options('media_assets')),
};
