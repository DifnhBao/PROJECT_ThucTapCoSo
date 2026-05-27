const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SongSimilarity = sequelize.define(
  "SongSimilarity",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    song_id_1: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    song_id_2: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Điểm tương đồng từ hành vi người dùng (Collaborative Filtering)
    behavioral_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // Điểm tương đồng từ metadata (Content-Based Filtering: genre, artist, mood, vector)
    metadata_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // Điểm tổng hợp cuối cùng (Hybrid Score)
    final_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    // Lý do gợi ý ngắn gọn (vd: "same genre: Pop, shared listeners")
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Chi tiết tính điểm dạng JSON (vd: {genre_overlap: 0.8, cosine_sim: 0.72})
    detail: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "song_similarities",
    // Không dùng timestamps tự động: updated_at do engine tự cập nhật; không cần created_at
    timestamps: false,
    indexes: [
      {
        // Đảm bảo mỗi cặp (song_id_1, song_id_2) chỉ có đúng 1 record
        unique: true,
        name: "uq_song_pair",
        fields: ["song_id_1", "song_id_2"],
      },
      {
        name: "idx_song_id_1",
        fields: ["song_id_1"],
      },
      {
        name: "idx_song_id_2",
        fields: ["song_id_2"],
      },
      {
        // Index phục vụ ORDER BY final_score DESC khi lấy top N bài tương tự
        name: "idx_final_score",
        fields: ["final_score"],
      },
    ],
  },
);

module.exports = SongSimilarity;
