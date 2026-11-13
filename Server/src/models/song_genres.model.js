const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SongGenre = sequelize.define(
  "SongGenre",
  {
    song_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    genre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    tableName: "song_genres",
    timestamps: false,
  },
);

module.exports = SongGenre;
