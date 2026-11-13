"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    // ==========================================
    // PHẦN 1: TẠO CÁC BẢNG ĐỘC LẬP (Không chứa FK)
    // ==========================================

    // 1. Bảng users
    await queryInterface.createTable("users", {
      user_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false },
      password: { type: Sequelize.STRING(255), allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      birthday: { type: Sequelize.DATEONLY, allowNull: true },
      phone_number: { type: Sequelize.STRING(20), allowNull: true },
      address: { type: Sequelize.STRING(255), allowNull: true },
      gender: {
        type: Sequelize.ENUM("male", "female", "other"),
        allowNull: true,
      },
      avatar_url: { type: Sequelize.STRING(500), allowNull: true },
      role: {
        type: Sequelize.ENUM("user", "admin", "super_admin"),
        allowNull: false,
        defaultValue: "user",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      activity_status: {
        type: Sequelize.ENUM("online", "offline"),
        allowNull: false,
        defaultValue: "offline",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Indexes cho users
    await queryInterface.addIndex("users", ["username"], {
      unique: true,
      name: "unique_users_username",
    });
    await queryInterface.addIndex("users", ["email"], {
      unique: true,
      name: "unique_users_email",
    });

    // 2. Bảng songs
    await queryInterface.createTable("songs", {
      song_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      duration: { type: Sequelize.INTEGER, defaultValue: 0 },
      audio_url: { type: Sequelize.STRING(500), allowNull: false },
      image_url: { type: Sequelize.STRING(500), allowNull: true },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: "Valid views after >=20s",
      },
      is_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 3. Bảng artists
    await queryInterface.createTable("artists", {
      artist_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      image_url: { type: Sequelize.STRING(500), allowNull: true },
      normalized_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
    });

    // 4. Bảng playlists
    await queryInterface.createTable("playlists", {
      playlist_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING },
      type: {
        type: Sequelize.ENUM("DAILY_MIX", "NORMAL"),
        defaultValue: "NORMAL",
      },
      mix_date: { type: Sequelize.DATEONLY, allowNull: true },
    });

    // 5. Bảng genres
    await queryInterface.createTable("genres", {
      genre_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      normalized_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
    });

    // ==========================================
    // PHẦN 2: TẠO CÁC BẢNG PHỤ THUỘC (Chứa FK)
    // ==========================================

    // 6. Bảng refresh_tokens (Phụ thuộc users)
    await queryInterface.createTable("refresh_tokens", {
      token_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Hashed refresh token (SHA-256)",
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Indexes cho refresh_tokens
    await queryInterface.addIndex("refresh_tokens", ["token"], {
      unique: true,
    });
    await queryInterface.addIndex("refresh_tokens", ["user_id"]);
    await queryInterface.addIndex("refresh_tokens", ["expires_at"]);

    // 7. Bảng song_artists (Phụ thuộc songs, artists)
    await queryInterface.createTable("song_artists", {
      song_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "songs", key: "song_id" },
        onDelete: "CASCADE",
      },
      artist_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "artists", key: "artist_id" },
        onDelete: "CASCADE",
      },
    });

    // 8. Bảng favorites (Phụ thuộc users, songs)
    await queryInterface.createTable("favorites", {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onDelete: "CASCADE",
      },
      song_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "songs", key: "song_id" },
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // 9. Bảng ratings (Phụ thuộc users, songs)
    await queryInterface.createTable("ratings", {
      rating_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onDelete: "CASCADE",
      },
      song_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "songs", key: "song_id" },
        onDelete: "CASCADE",
      },
      score: { type: Sequelize.TINYINT, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Indexes cho ratings
    await queryInterface.addIndex("ratings", ["user_id", "song_id"], {
      unique: true,
    });
    await queryInterface.addIndex("ratings", ["song_id"]);

    // 9. Bảng song_genres (Phụ thuộc songs, genres)
    await queryInterface.createTable("song_genres", {
      song_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "songs", key: "song_id" },
        onDelete: "CASCADE",
      },
      genre_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "genres", key: "genre_id" },
        onDelete: "CASCADE",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */

    // Khi Rollback (undo), phải XÓA NGƯỢC LẠI: Xóa bảng phụ trước, bảng chính sau để không vi phạm khóa ngoại
    await queryInterface.dropTable("ratings");
    await queryInterface.dropTable("favorites");
    await queryInterface.dropTable("song_genres"); // thêm 1st
    await queryInterface.dropTable("song_artists");
    await queryInterface.dropTable("refresh_tokens");
    await queryInterface.dropTable("playlists");
    await queryInterface.dropTable("genres"); // thêm 1st
    await queryInterface.dropTable("artists");
    await queryInterface.dropTable("songs");
    await queryInterface.dropTable("users");
  },
};

// Chay: npx sequelize-cli db:migrate
