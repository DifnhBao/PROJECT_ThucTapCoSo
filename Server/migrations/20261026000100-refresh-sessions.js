module.exports = {
  async up(q, S) {
    // Deploy with writers stopped. Old refresh JWTs are deliberately invalidated.
    // MySQL DDL auto-commits; each addition is restartable after interrupted DDL.
    const definitions = {
      family_id: { type: S.STRING(36), allowNull: true },
      scope: { type: S.STRING(5), allowNull: true },
      consumed_at: { type: S.DATE(3), allowNull: true },
      revoked_at: { type: S.DATE(3), allowNull: true },
      replacement_digest: { type: S.STRING(64), allowNull: true },
    };
    const columns = await q.describeTable('refresh_tokens');
    for (const [name, definition] of Object.entries(definitions)) {
      if (!columns[name]) await q.addColumn('refresh_tokens', name, definition);
    }
    // NULL family denotes only pre-release rows, including partially migrated rows.
    await q.sequelize.query('DELETE FROM refresh_tokens WHERE family_id IS NULL OR scope IS NULL');
    await q.changeColumn('refresh_tokens', 'family_id', { type: S.STRING(36), allowNull: false });
    await q.changeColumn('refresh_tokens', 'scope', { type: S.STRING(5), allowNull: false });
    await q.changeColumn('refresh_tokens', 'token', { type: S.STRING(64), allowNull: false, comment: 'SHA-256 digest; never a raw token' });
    const indexes = await q.showIndex('refresh_tokens');
    if (!indexes.some((i) => i.name === 'refresh_family_scope')) {
      await q.addIndex('refresh_tokens', ['family_id', 'scope'], { name: 'refresh_family_scope' });
    }
  },
  async down() { throw new Error('Forward-only session migration; legacy credentials cannot be restored'); },
};
