const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// const Album = require("./album.model");
const Artist = require("./artist.model");
// const Comment = require("./comment.model");
// const Genre = require("./genre.model");
const Playlist = require("./playlist.model");
const Song = require("./song.model");
const User = require("./user.model");
const RefreshToken = require("./refresh_token.model");

// MQH 1-N

// Artist.hasMany(Album, { foreignKey: "artist_id" });
// Album.belongsTo(Artist, { foreignKey: "artist_id" });

Artist.hasMany(Song, {
  foreignKey: "artist_id",
  as: "songs",
});

Song.belongsTo(Artist, {
  foreignKey: "artist_id",
  as: "artists",
});

// Album.hasMany(Song, { foreignKey: "album_id" });
// Song.belongsTo(Album, { foreignKey: "album_id" });

// Genre.hasMany(Song, { foreignKey: "genre_id" });
// Song.belongsTo(Genre, { foreignKey: "genre_id" });

// User.hasMany(Playlist, { foreignKey: "user_id" });
// Playlist.belongsTo(User, { foreignKey: "user_id" });

// User.hasMany(Comment, { foreignKey: "user_id" });
// Comment.belongsTo(User, { foreignKey: "user_id" });

// Song.hasMany(Comment, { foreignKey: "song_id" });
// Comment.belongsTo(Song, { foreignKey: "song_id" });

// Comment.hasMany(Comment, { as: "replies", foreignKey: "parent_comment_id" });
// Comment.belongsTo(Comment, { as: "parent", foreignKey: "parent_comment_id" });

User.hasMany(RefreshToken, {
  foreignKey: "user_id",
  as: "tokens",
});

RefreshToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// MQH N-N

const Favorites = sequelize.define(
  "favorites",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    song_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: "songs",
        key: "song_id",
      },
      onDelete: "CASCADE",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "favorites",
    timestamps: false,
  }
);

User.belongsToMany(Song, {
  through: Favorites,
  foreignKey: "user_id",
  as: "likedSongs",
});
Song.belongsToMany(User, {
  through: Favorites,
  foreignKey: "song_id",
  as: "likedByUsers",
});

// Bảng trung gian playlist và song
const PlaylistSongs = sequelize.define(
  "playlistSongs",
  {
    playlist_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    song_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    added_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "playlist_songs",
    timestamps: false,
  }
);

Playlist.belongsToMany(Song, {
  through: PlaylistSongs,
  foreignKey: "playlist_id",
});
Song.belongsToMany(Playlist, {
  through: PlaylistSongs,
  foreignKey: "song_id",
});

// Đồng bộ Database

const syncDatabase = async () => {
  try {
    // update cho DB
    await sequelize.sync();
    console.log("UPDATED");
  } catch (error) {
    console.error("ERROR", error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  // Album,
  Artist,
  // Comment,
  // Genre,
  Playlist,
  Song,
  User,
  RefreshToken,
  Favorites,
  PlaylistSongs,
};
