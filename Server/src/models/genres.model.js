const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Genre = sequelize.define(
  "Genre",
  {
    genre_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    normalized_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "genres",
    timestamps: false,
  }
);

module.exports = Genre;