const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PlaylistSong = sequelize.define(
  "PlaylistSong",
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: "playlists",
        key: "playlist_id",
      },
      onDelete: "CASCADE",
    },

    song_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: "songs",
        key: "song_id",
      },
      onDelete: "CASCADE",
    },

    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "playlist_songs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["playlist_id"],
      },
      {
        fields: ["song_id"],
      },
      {
        unique: true,
        fields: ["playlist_id", "position"],
      },
    ],
  },
);

module.exports = PlaylistSong;
