// models/Playlist.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Playlist = sequelize.define(
  "Playlist",
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    cover_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    type: {
      type: DataTypes.ENUM("DAILY_MIX", "NORMAL"),
      defaultValue: "NORMAL",
    },

    mix_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },

  {
    tableName: "playlists",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["user_id"],
      },
    ],
  },
);

module.exports = Playlist;
