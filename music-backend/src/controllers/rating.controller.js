const ratingService = require("../services/rating.service"); // Gọi Service vào

exports.rateSong = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { song_id, score } = req.body;

        if (score < 1 || score > 5) {
            return res.status(400).json({ message: "Điểm phải từ 1 đến 5" });
        }

        const result = await ratingService.rateSong(userId, song_id, score);

        if (result.type === "UPDATE") {
            res.status(200).json({ message: "Cập nhật đánh giá thành công", data: result.data });
        } else {
            res.status(201).json({ message: "Đánh giá thành công", data: result.data });
        }

    } catch (error) {
        if (error.message === "SongNotFound") {
            return res.status(404).json({ message: "Không tìm thấy bài hát!" });
        }
        console.error(error);
        res.status(500).json({ message: "Lỗi Server" });
    }
};

exports.getSongRating = async (req, res) => {
    try {
        const { song_id } = req.params;

        const data = await ratingService.getSongRating(song_id);

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server" });
    }
};