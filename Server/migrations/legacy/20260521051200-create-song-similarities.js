"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("song_similarities", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      song_id_1: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Không dùng references cứng để tránh ràng buộc FK làm chậm bulk-upsert
      },

      song_id_2: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      behavioral_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      metadata_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      final_score: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },

      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      detail: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Unique index đảm bảo không có record trùng cặp bài hát
    await queryInterface.addIndex("song_similarities", ["song_id_1", "song_id_2"], {
      unique: true,
      name: "uq_song_pair",
    });

    // Index độc lập để query nhanh các bài tương tự của một song_id
    await queryInterface.addIndex("song_similarities", ["song_id_1"], {
      name: "idx_song_id_1",
    });

    await queryInterface.addIndex("song_similarities", ["song_id_2"], {
      name: "idx_song_id_2",
    });

    // Index hỗ trợ ORDER BY final_score DESC khi lấy top-N recommendations
    await queryInterface.addIndex("song_similarities", ["final_score"], {
      name: "idx_final_score",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("song_similarities");
  },
};
