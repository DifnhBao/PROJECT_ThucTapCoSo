const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SongArtist = sequelize.define(
    "SongArtist",
    {
        // Sequelize tự động tạo khóa ngoại
    },
    {
        tableName: "song_artists",
        timestamps: false,
    }
);

module.exports = SongArtist;