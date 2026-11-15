module.exports = {
  async up(q, S) {
    const [partitions] = await q.sequelize.query("SELECT PARTITION_NAME FROM information_schema.PARTITIONS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='UserActivities' AND PARTITION_NAME IS NOT NULL");
    if (partitions.length) throw new Error('Apply T04 reconciliation before listening events; partitioned table cannot use this unique key');
    const definitions = {
      event_id: { type: S.STRING(36), allowNull: true },
      payload_digest: { type: S.STRING(64), allowNull: true },
      event_version: { type: S.SMALLINT, allowNull: true },
      qualified: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
    };
    // Legacy rows stay nullable, with no recount. MySQL DDL is nontransactional;
    // allow re-entry after interruption without dropping historical activities.
    const columns = await q.describeTable('UserActivities');
    for (const [name, definition] of Object.entries(definitions)) if (!columns[name]) await q.addColumn('UserActivities', name, definition);
    const indexes = await q.showIndex('UserActivities');
    if (!indexes.some((index) => index.name === 'uq_activity_user_event')) await q.addIndex('UserActivities', ['user_id', 'event_id'], { name: 'uq_activity_user_event', unique: true });
  },
  async down() { throw new Error('Forward-only: dropping receipts would allow accepted events to count again'); },
};
