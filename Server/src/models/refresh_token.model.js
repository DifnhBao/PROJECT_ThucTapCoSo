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
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: "Hashed refresh token (SHA-256)",
    },

    family_id: { type: DataTypes.STRING(36), allowNull: false },
    scope: { type: DataTypes.STRING(5), allowNull: false, validate: { isIn: [['user', 'admin']] } },
    consumed_at: { type: DataTypes.DATE(3), allowNull: true },
    revoked_at: { type: DataTypes.DATE(3), allowNull: true },
    replacement_digest: { type: DataTypes.STRING(64), allowNull: true },
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
      { name: "refresh_family_scope", fields: ["family_id", "scope"] },
      { fields: ["expires_at"] },
    ],
  },
);

module.exports = RefreshToken;
