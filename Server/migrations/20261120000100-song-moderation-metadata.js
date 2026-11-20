module.exports = {
  async up(q, S) {
    const columns = await q.describeTable('songs');
    if (!columns.rejection_reason) {
      await q.addColumn('songs', 'rejection_reason', { type: S.STRING(500), allowNull: true });
    }
    if (!columns.reviewed_at) {
      await q.addColumn('songs', 'reviewed_at', { type: S.DATE, allowNull: true });
    }
  },
  async down() { throw new Error('Forward-only: song moderation history is retained'); },
};
