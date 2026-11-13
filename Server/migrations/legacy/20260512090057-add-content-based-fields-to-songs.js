"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Thêm các cột mới vào bảng Songs
    await queryInterface.addColumn("songs", "lyrics", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("songs", "mood", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("songs", "keywords", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("songs", "vector_embedding", {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Xóa các cột này nếu muốn rollback
    await queryInterface.removeColumn("songs", "lyrics");
    await queryInterface.removeColumn("songs", "mood");
    await queryInterface.removeColumn("songs", "keywords");
    await queryInterface.removeColumn("songs", "vector_embedding");
  },
};
