const db = require("../models");
const Rating = db.Rating;
const Song = db.Song;
const sequelize = db.sequelize;


const rateSong = async (userId, songId, score) => {
    const song = await Song.findByPk(songId);
    if (!song) {
        throw new Error("SongNotFound");
    }

    const existingRating = await Rating.findOne({
        where: {
            user_id: userId,
            song_id: songId,
        },
    });

    if (existingRating) {
        existingRating.score = score;
        await existingRating.save();
        return { type: "UPDATE", data: existingRating }
    } else {
        const newRating = await Rating.create({
            user_id: userId,
            song_id: songId,
            score: score,
        });
        return { type: "CREATE", data: newRating };
    }
};

// Hàm lấy điểm trung bình
const getSongRating = async (songId) => {
    const result = await Rating.findOne({
        where: { song_id: songId },
        attributes: [
            [sequelize.fn("AVG", sequelize.col("score")), "averageScore"],
            [sequelize.fn("COUNT", sequelize.col("rating_id")), "totalReviews"],
        ],
        raw: true,
    });

    return {
        song_id: songId,
        average_score: result.averageScore ? parseFloat(result.averageScore).toFixed(1) : 0,
        total_reviews: result.totalReviews || 0,
    };
};

module.exports = {
    rateSong,
    getSongRating,
};