const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Rating = sequelize.define(
    "Rating",
    {
        rating_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        score: {
            type: DataTypes.TINYINT,
            allowNull: false,
            validate: {
                min: 1, // Điểm thấp nhất là 1
                max: 5, // Điểm cao nhất là 5 
            },
        },

        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "ratings",
        timestamps: true,
        createdAt: "created_at",
        indexes: [
            {
                unique: true,
                fields: ["user_id", "song_id"], // Đảm bảo 1 User chỉ đánh giá 1 Bài hát đúng 1 lần
            },
        ],
    }
);

module.exports = Rating;