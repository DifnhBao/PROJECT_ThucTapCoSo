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
    name: DataTypes.STRING,
    type: {
      type: DataTypes.ENUM("DAILY_MIX", "NORMAL"),
      defaultValue: "NORMAL",
    },
    mix_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "playlists",
    timestamps: false,
  }
);

module.exports = Playlist;
