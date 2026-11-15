module.exports = {
  async up(q) {
    // Forward-only and retryable: legacy similarities are preserved, never served as v1 snapshots.
    await q.sequelize.query(`CREATE TABLE IF NOT EXISTS recommendation_runs (
      run_id CHAR(36) PRIMARY KEY, algorithm_version VARCHAR(64) NOT NULL,
      config JSON NOT NULL, song_count INT NOT NULL, edge_count INT NOT NULL,
      created_at DATETIME(3) NOT NULL
    ) ENGINE=InnoDB`);
    await q.sequelize.query(`CREATE TABLE IF NOT EXISTS recommendation_state (
      id TINYINT PRIMARY KEY, active_run_id CHAR(36) NULL
    ) ENGINE=InnoDB`);
    await q.sequelize.query('INSERT IGNORE INTO recommendation_state (id, active_run_id) VALUES (1, NULL)');
    await q.sequelize.query(`CREATE TABLE IF NOT EXISTS recommendation_neighbors (
      run_id CHAR(36) NOT NULL, seed_id INT NOT NULL, song_id INT NOT NULL,
      final_score DOUBLE NOT NULL, metadata_score DOUBLE NOT NULL, behavioral_score DOUBLE NOT NULL,
      reason TEXT NOT NULL, detail JSON NOT NULL,
      PRIMARY KEY (run_id, seed_id, song_id),
      INDEX ix_neighbor_rank (run_id, seed_id, final_score DESC, song_id ASC)
    ) ENGINE=InnoDB`);
    // UserActivity has no user-leading read index on legacy schemas.
    const indexes = await q.showIndex('UserActivities');
    if (!indexes.some((i) => i.name === 'ix_activity_user_qualified_recent')) {
      await q.addIndex('UserActivities', ['user_id', 'event_version', 'qualified', 'id'], { name: 'ix_activity_user_qualified_recent' });
    }
  },
  async down() { throw new Error('Forward-only: snapshot history is retained'); },
};
