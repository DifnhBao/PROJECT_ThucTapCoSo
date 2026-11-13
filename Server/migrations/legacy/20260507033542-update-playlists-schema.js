"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // =========================
    // ADD user_id
    // =========================

    await queryInterface.addColumn("playlists", "user_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    });

    // =========================
    // ADD description
    // =========================

    await queryInterface.addColumn("playlists", "description", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // =========================
    // ADD cover_image_url
    // =========================

    await queryInterface.addColumn(
      "playlists",
      "cover_image_url",
      {
        type: Sequelize.STRING(500),
        allowNull: true,
      }
    );

    // =========================
    // ADD is_public
    // =========================

    await queryInterface.addColumn("playlists", "is_public", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // =========================
    // ADD timestamps
    // =========================

    await queryInterface.addColumn("playlists", "created_at", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    await queryInterface.addColumn("playlists", "updated_at", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });

    // =========================
    // ADD INDEX
    // =========================

    await queryInterface.addIndex("playlists", ["user_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("playlists", ["user_id"]);

    await queryInterface.removeColumn(
      "playlists",
      "updated_at"
    );

    await queryInterface.removeColumn(
      "playlists",
      "created_at"
    );

    await queryInterface.removeColumn(
      "playlists",
      "is_public"
    );

    await queryInterface.removeColumn(
      "playlists",
      "cover_image_url"
    );

    await queryInterface.removeColumn(
      "playlists",
      "description"
    );

    await queryInterface.removeColumn(
      "playlists",
      "user_id"
    );
  },
};