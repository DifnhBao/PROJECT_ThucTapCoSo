"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("playlist_songs", {
      playlist_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "playlists",
          key: "playlist_id",
        },
        onDelete: "CASCADE",
      },

      song_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
          model: "songs",
          key: "song_id",
        },
        onDelete: "CASCADE",
      },

      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("playlist_songs", ["playlist_id"]);

    await queryInterface.addIndex("playlist_songs", ["song_id"]);

    await queryInterface.addIndex(
      "playlist_songs",
      ["playlist_id", "position"],
      {
        unique: true,
        name: "unique_playlist_position",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("playlist_songs");
  },
};
