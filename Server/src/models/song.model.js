const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Song = sequelize.define(
  "Song",
  {
    song_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    audio_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Valid views after >=20s",
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lyrics: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
  },
  {
    tableName: "songs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Song;
