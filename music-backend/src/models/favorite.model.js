const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Favorite = sequelize.define(
    "Favorite",
    {

        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "favorites",
        timestamps: true,      // Bật lên để dùng tính năng ngày tháng
        createdAt: "created_at", // Map đúng tên cột trong database
    }
);

module.exports = Favorite;