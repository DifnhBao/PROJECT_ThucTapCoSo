const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SongArtist = sequelize.define(
  "SongArtist",
  {
    song_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    artist_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    tableName: "song_artists",
    timestamps: false,
  },
);

module.exports = SongArtist;
