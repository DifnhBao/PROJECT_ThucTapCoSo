const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Artist = sequelize.define(
  "Artist",
  {
    artist_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    jamendo_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "artists",
    timestamps: false,
  }
);

module.exports = Artist;
