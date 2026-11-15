"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Sử dụng Raw SQL để tạo bảng nhằm kiểm soát 100% cấu trúc tối ưu
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS UserActivities (
        id BIGINT AUTO_INCREMENT NOT NULL,
        user_id INT NOT NULL,
        song_id INT NOT NULL,
        session_id VARCHAR(64) NOT NULL,
        source VARCHAR(50) NOT NULL COMMENT 'e.g., search, playlist, recommendation, radio',
        exit_reason VARCHAR(50) COMMENT 'ended, skipped, tab_closed',
        max_position_reached FLOAT DEFAULT 0,
        play_pause_count SMALLINT DEFAULT 0,
        seek_count SMALLINT DEFAULT 0,
        song_duration FLOAT NOT NULL,
        total_listened_time FLOAT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        -- LUẬT QUAN TRỌNG CỦA MYSQL: Cột phân vùng phải nằm trong Primary Key
        PRIMARY KEY (id, created_at),
        
        -- Các Indexes hỗ trợ truy vấn siêu tốc
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_song_created (song_id, created_at),
        INDEX idx_session_id (session_id),
        INDEX idx_created_at (created_at),
        INDEX idx_user_song_created (user_id, song_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Ép Rule Phân vùng theo tháng (Partition by Range)
    await queryInterface.sequelize.query(`
      ALTER TABLE UserActivities
      PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
          PARTITION p202601 VALUES LESS THAN (202602),
          PARTITION p202602 VALUES LESS THAN (202603),
          PARTITION p202603 VALUES LESS THAN (202604),
          PARTITION p202604 VALUES LESS THAN (202605),
          PARTITION p202605 VALUES LESS THAN (202606),
          PARTITION p202606 VALUES LESS THAN (202607),
          PARTITION p202607 VALUES LESS THAN (202608),
          PARTITION p202608 VALUES LESS THAN (202609),
          PARTITION p202609 VALUES LESS THAN (202610),
          PARTITION p202610 VALUES LESS THAN (202611),
          PARTITION p202611 VALUES LESS THAN (202612),
          PARTITION p202612 VALUES LESS THAN (202701),
          PARTITION pMax VALUES LESS THAN MAXVALUE
      );
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Hàm này chạy khi bạn muốn rollback (hủy) migration
    await queryInterface.dropTable("UserActivities");
  },
};
