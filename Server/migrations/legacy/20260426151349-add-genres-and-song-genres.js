"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tạo bảng genres
    await queryInterface.createTable("genres", {
      genre_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      normalized_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
    });

    // 2. Tạo bảng song_genres
    await queryInterface.createTable("song_genres", {
      song_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "songs", key: "song_id" },
        onDelete: "CASCADE",
      },
      genre_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "genres", key: "genre_id" },
        onDelete: "CASCADE",
      },
    });

    // (optional nhưng nên có) index
    await queryInterface.addIndex("song_genres", ["song_id"]);
    await queryInterface.addIndex("song_genres", ["genre_id"]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    await queryInterface.dropTable("song_genres");
    await queryInterface.dropTable("genres");
  },
};
