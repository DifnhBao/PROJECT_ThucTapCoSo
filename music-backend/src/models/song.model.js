const { DataTypes, DATE } = require("sequelize");
const sequelize = require("../config/db");

const Song = sequelize.define(
  "Song",
  {
    song_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    jamendo_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
    },
    audio_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    artist_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    album_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Other",
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    artist_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "artists",
        key: "artist_id",
      },
    },
    // upload_date: {
    //   type: DataTypes.DATE,
    //   defaultValue: DataTypes.NOW,
    // },
    is_visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    fetched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "songs",
    timestamps: false,
  }
);

module.exports = Song;
