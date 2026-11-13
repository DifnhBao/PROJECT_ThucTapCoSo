module.exports = (S) => {
  const id = { type: S.INTEGER, primaryKey: true, autoIncrement: true };
  const dates = () => ({ created_at: { type: S.DATE, allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') }, updated_at: { type: S.DATE, allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') } });
  return {
    upload_receipts: {
      id, user_id: { type: S.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      key_digest: { type: S.STRING(64), allowNull: false }, payload_digest: { type: S.STRING(64), allowNull: false },
      status: { type: S.STRING(16), allowNull: false }, response: { type: S.JSON, allowNull: true }, ...dates(),
    },
    media_assets: {
      id: { type: S.STRING(36), primaryKey: true }, receipt_id: { type: S.INTEGER, allowNull: true, references: { model: 'upload_receipts', key: 'id' }, onDelete: 'SET NULL' },
      public_id: { type: S.STRING(160), allowNull: false }, resource_type: { type: S.STRING(5), allowNull: false }, delivery_type: { type: S.STRING(16), allowNull: false },
      format: { type: S.STRING(10), allowNull: false }, state: { type: S.STRING(20), allowNull: false },
      song_id: { type: S.INTEGER, allowNull: true, references: { model: 'songs', key: 'song_id' }, onDelete: 'SET NULL' },
      avatar_user_id: { type: S.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' }, onDelete: 'SET NULL' }, ...dates(),
    },
  };
};
