module.exports = {
  async up(q, S) {
    const schema = require('../database/upload-schema.cjs')(S);
    const tables = await q.showAllTables();
    for (const [name, fields] of Object.entries(schema)) if (!tables.includes(name)) await q.createTable(name, fields);
    for (const [table, fields, name, unique] of [
      ['upload_receipts', ['user_id', 'key_digest'], 'upload_user_key', true],
      ['media_assets', ['public_id', 'resource_type', 'delivery_type'], 'media_provider_identity', true],
      ['media_assets', ['state', 'updated_at'], 'media_cleanup_queue', false],
    ]) if (!(await q.showIndex(table)).some((index) => index.name === name)) await q.addIndex(table, fields, { name, unique });
  },
  async down() { throw new Error('Forward-only: asset lifecycle records must not be discarded'); },
};
