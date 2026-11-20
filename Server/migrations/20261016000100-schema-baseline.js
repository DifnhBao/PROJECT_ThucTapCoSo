const schema = require('../database/schema-v1.cjs');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  async up(q, S) {
    const tables = (await q.showAllTables()).filter((name) => name !== 'SequelizeMeta');
    if (tables.length) {
      const [rows] = await q.sequelize.query('SELECT name FROM SequelizeMeta');
      const applied = new Set(rows.map((row) => row.name));
      const legacy = fs.readdirSync(path.join(__dirname, 'legacy')).filter((file) => file.endsWith('.js'));
      if (!legacy.every((name) => applied.has(name))) throw new Error('Nonempty database without complete legacy migration history: backup and reconcile manually; baseline refused');
      for (const [table, columns] of Object.entries(schema(S))) {
        if (!tables.includes(table)) throw new Error(`Legacy schema missing table ${table}`);
        const actual = await q.describeTable(table);
        for (const column of Object.keys(columns)) if (!actual[column]) throw new Error(`Legacy schema missing ${table}.${column}`);
      }
      return; // The next forward migration reconciles existing data; no legacy DDL is replayed.
    }
    for (const [table, columns] of Object.entries(schema(S))) await q.createTable(table, columns, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    for (const [table, indexes] of Object.entries(schema.indexes)) {
      for (const [fields, name, unique = false] of indexes) await q.addIndex(table, fields, { name, unique });
    }
  },
  async down() { throw new Error('Forward-only baseline: restore a verified backup instead of dropping application tables'); },
};
