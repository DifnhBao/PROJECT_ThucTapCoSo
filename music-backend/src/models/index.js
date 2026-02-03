const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const User = require("./user.model");
const Song = require("./song.model");
const Artist = require("./artist.model");
const RefreshToken = require("./refresh_token.model");
const Rating = require("./rating.model");


const Favorite = require("./favorite.model");
const SongArtist = require("./song_artist.model");


// const Playlist = require("./playlist.model"); 
// const PlaylistSong = require("./playlist_song.model");

// 1. User - RefreshToken (Quan hệ 1-N)
// Một User có nhiều Token
User.hasMany(RefreshToken, { foreignKey: "user_id", as: "tokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 2. User - Song: Yêu thích (Quan hệ N-N qua bảng Favorite)
User.belongsToMany(Song, {
  through: Favorite,
  foreignKey: "user_id",
  as: "likedSongs" // Khi query User sẽ lấy được list bài hát đã like
});

Song.belongsToMany(User, {
  through: Favorite,
  foreignKey: "song_id",
  as: "likedByUsers"
});

// 3. Song - Artist: Trình bày (Quan hệ N-N qua bảng SongArtist)
Song.belongsToMany(Artist, {
  through: SongArtist,
  foreignKey: "song_id",
  as: "artists" // Một bài hát có thể do nhiều ca sĩ hát
});

Artist.belongsToMany(Song, {
  through: SongArtist,
  foreignKey: "artist_id",
  as: "songs" // Một ca sĩ có thể hát nhiều bài
});

// 4. Rating: Đánh giá (Quan hệ 1-N)
// User đánh giá Song
User.hasMany(Rating, { foreignKey: "user_id" });
Rating.belongsTo(User, { foreignKey: "user_id" });

Song.hasMany(Rating, { foreignKey: "song_id" });
Rating.belongsTo(Song, { foreignKey: "song_id" });


// HÀM ĐỒNG BỘ DATABASE

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log(">>> DATABASE SYNCED SUCCESSFULLY! (All tables created) <<<");
  } catch (error) {
    console.error(">>> SYNC ERROR:", error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  Song,
  Artist,
  RefreshToken,
  Rating,
  Favorite,
  SongArtist,
};