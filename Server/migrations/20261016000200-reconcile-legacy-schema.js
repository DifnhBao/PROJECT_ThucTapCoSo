const schema = require('../database/schema-v1.cjs');
module.exports = {
  async up(q, S) {
    // MySQL DDL commits implicitly. Preflight before any change; rerunning is supported.
    const [orphans] = await q.sequelize.query(`SELECT COUNT(*) AS n FROM UserActivities a LEFT JOIN users u ON u.user_id=a.user_id LEFT JOIN songs s ON s.song_id=a.song_id WHERE u.user_id IS NULL OR s.song_id IS NULL`);
    const [duplicates] = await q.sequelize.query('SELECT id FROM UserActivities GROUP BY id HAVING COUNT(*) > 1 LIMIT 1');
    const [unnamed] = await q.sequelize.query('SELECT playlist_id FROM playlists WHERE name IS NULL LIMIT 1');
    if (Number(orphans[0].n) || duplicates.length || unnamed.length) throw new Error('Legacy data needs manual repair: orphan activity, duplicate activity id, or NULL playlist name; no data deleted');
    const timestampTables = ['users', 'songs', 'refresh_tokens', 'favorites', 'ratings', 'playlists', 'playlist_songs'];
    for (const table of timestampTables) {
      const [missing] = await q.sequelize.query(`SELECT 1 FROM \`${table}\` WHERE created_at IS NULL OR updated_at IS NULL LIMIT 1`);
      if (missing.length) throw new Error(`Legacy ${table} timestamps contain NULL; repair explicitly before migration`);
    }
    const [partitions] = await q.sequelize.query("SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='UserActivities' AND PARTITION_NAME IS NOT NULL");
    if (partitions.length) await q.sequelize.query('ALTER TABLE UserActivities REMOVE PARTITIONING');
    const columns = await q.describeTable('UserActivities');
    if (columns.created_at.primaryKey) await q.sequelize.query('ALTER TABLE UserActivities DROP PRIMARY KEY, ADD PRIMARY KEY (id)');
    const foreignKeys = await q.getForeignKeyReferencesForTable('UserActivities');
    for (const [column, table, key] of [['user_id', 'users', 'user_id'], ['song_id', 'songs', 'song_id']]) {
      if (!foreignKeys.some((fk) => fk.columnName === column)) await q.addConstraint('UserActivities', { fields: [column], type: 'foreign key', name: `fk_activity_${column}`, references: { table, field: key }, onDelete: 'CASCADE' });
    }
    await q.changeColumn('playlists', 'name', { type: S.STRING(255), allowNull: false });
    for (const table of timestampTables) {
      const actual = await q.describeTable(table);
      for (const column of ['created_at', 'updated_at']) if (actual[column].allowNull) await q.changeColumn(table, column, { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') });
    }
    // Idempotently ensure named business indexes, regardless of legacy index names.
    for (const [table, indexes] of Object.entries(schema.indexes)) {
      const actual = await q.showIndex(table);
      for (const [fields, name, unique = false] of indexes) {
        if (!actual.some((index) => (!unique || index.unique) && index.fields.map((field) => field.attribute).join(',') === fields.join(','))) await q.addIndex(table, fields, { name, unique });
      }
    }
  },
  async down() { throw new Error('Forward-only reconciliation: partition rollback requires a separately reviewed data migration'); },
};
