const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./user.model");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    token_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Hashed refresh token (SHA-256)",
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["token"] },
      { fields: ["user_id"] },
      { fields: ["expires_at"] },
    ],
  },
);

module.exports = RefreshToken;
