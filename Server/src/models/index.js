const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const User = require("./user.model");
const Song = require("./song.model");
const Artist = require("./artist.model");
const RefreshToken = require("./refresh_token.model");
const Rating = require("./rating.model");
const Favorite = require("./favorite.model");
const SongArtist = require("./song_artist.model");
const Genre = require("./genres.model");
const SongGenre = require("./song_genres.model");
const Playlist = require("./playlist.model");
const PlaylistSong = require("./playlist_song.model");
const UserActivity = require("./user_activity.model")(sequelize, DataTypes);

// 1. User - RefreshToken (Quan hệ 1-N)
// Một User có nhiều Token
User.hasMany(RefreshToken, { foreignKey: "user_id", as: "tokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 2. User - Song: Yêu thích (Quan hệ N-N qua bảng Favorite)
User.belongsToMany(Song, {
  through: Favorite,
  foreignKey: "user_id",
  otherKey: "song_id",
  as: "likedSongs", // Khi query User sẽ lấy được list bài hát đã like
});

Song.belongsToMany(User, {
  through: Favorite,
  foreignKey: "song_id",
  otherKey: "user_id",
  as: "likedByUsers",
});

// 3. Song - Artist: Trình bày (Quan hệ N-N qua bảng SongArtist)
Song.belongsToMany(Artist, {
  through: SongArtist,
  foreignKey: "song_id",
  otherKey: "artist_id",
  as: "artists", // Một bài hát có thể do nhiều ca sĩ hát
});

Artist.belongsToMany(Song, {
  through: SongArtist,
  foreignKey: "artist_id",
  otherKey: "song_id",
  as: "songs", // Một ca sĩ có thể hát nhiều bài
});

// 4. Rating: Đánh giá (Quan hệ 1-N)
// User đánh giá Song
User.hasMany(Rating, { foreignKey: "user_id", as: "ratings" });
Rating.belongsTo(User, { foreignKey: "user_id", as: "user" });

Song.hasMany(Rating, { foreignKey: "song_id", as: "ratings" });
Rating.belongsTo(Song, { foreignKey: "song_id", as: "song" });

// 5. Song - Genre: Thể loại (Quan hệ N-N)
Song.belongsToMany(Genre, {
  through: SongGenre,
  foreignKey: "song_id",
  otherKey: "genre_id",
  as: "genres",
});

Genre.belongsToMany(Song, {
  through: SongGenre,
  foreignKey: "genre_id",
  otherKey: "song_id",
  as: "songs",
});

// Favorite -> Song (CẦN CHO API favorites)
Favorite.belongsTo(Song, {
  foreignKey: "song_id",
  as: "song",
});

Song.hasMany(Favorite, {
  foreignKey: "song_id",
});

// Song - User: Người đăng (uploaded_by)
Song.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploader",
});

User.hasMany(Song, {
  foreignKey: "uploaded_by",
  as: "uploadedSongs",
});

// Playlist - Song: Quan hệ N-N qua bảng PlaylistSong
Song.belongsToMany(Playlist, {
  through: PlaylistSong,
  foreignKey: "song_id",
  otherKey: "playlist_id",
  as: "playlists",
});

Playlist.belongsToMany(Song, {
  through: PlaylistSong,
  foreignKey: "playlist_id",
  otherKey: "song_id",
  as: "songs",
});

// Playlist - User: Quan hệ N-1
User.hasMany(Playlist, {
  foreignKey: "user_id",
  as: "playlists",
});

Playlist.belongsTo(User, {
  foreignKey: "user_id",
  as: "owner",
  onDelete: "CASCADE",
});

// Chạy hàm associate cho UserActivity
// Truyền object chứa các models mà UserActivity cần liên kết (User, Song)
UserActivity.associate({ User, Song });

/* =========================================
   HÀM ĐỒNG BỘ
========================================= */
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(">>> MYSQL CONNECTED! DATABASE IS MANAGED BY MIGRATIONS <<<");
  } catch (error) {
    console.error(">>> MYSQL CONNECTION ERROR:", error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  Song,
  Artist,
  Genre,
  SongGenre,
  RefreshToken,
  Rating,
  Favorite,
  SongArtist,
  Playlist,
  PlaylistSong,
  UserActivity,
};
