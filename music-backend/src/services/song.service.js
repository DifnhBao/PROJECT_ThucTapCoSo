const {
  User,
  Song,
  Artist,
  Album,
  Genre,
  Favorites,
  PlaylistSongs,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const cloudinary = require("cloudinary").v2;
const { Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

/* --- CHỨC NĂNG CHO USER --- */

// const createSong = async (songData, audioUrl) => {
//   const { title, artist_id, album_id, genre_id, duration } = songData;

//   const newSong = await Song.create({
//     title,
//     artist_id,
//     album_id,
//     genre_id,
//     duration: parseInt(duration) || 0,
//     audio_url: audioUrl,
//     view_count: 0,
//   });

//   return newSong;
// };

// Lấy tất cả bài hát

const createSong = async ({ title, artist, genre, audio_url }) => {
  let artistRecord = null;

  // 1. Nếu có artist name → tìm hoặc tạo artist
  if (artist) {
    [artistRecord] = await Artist.findOrCreate({
      where: { name: artist },
      defaults: {
        jamendo_id: `upload-${uuidv4()}`,
        image_url: null,
      },
    });
  }

  // 2. Tạo song
  const newSong = await Song.create({
    jamendo_id: `upload-${uuidv4()}`,
    title,
    artist_name: artist || null,
    artist_id: artistRecord ? artistRecord.artist_id : null,
    genre: genre || "Other",
    audio_url,
    duration: 0,
    view_count: 0,
    is_visible: true,
  });

  // fetch lại có include
  const songWithArtist = await Song.findByPk(newSong.song_id, {
    include: {
      model: Artist,
      as: "artists",
    },
  });

  return songWithArtist;
};

const getAllSongs = async ({ page, limit, search }) => {
  const offset = (page - 1) * limit;

  if (search) {
    whereCondition.title = {
      [Op.like]: `%${search}%`,
    };
  }

  const { rows, count } = await Song.findAndCountAll({
    limit,
    offset,
    order: [["song_id", "DESC"]],
    include: [
      {
        model: Artist,
        as: "artists",
        attributes: ["artist_id", "name", "image_url"],
      },
    ],
  });

  return {
    data: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      limit,
    },
  };
};

// Lấy một bài hát
const getSongById = async (songId) => {
  const song = Song.findByPk(songId, {
    include: [{ model: Artist }, { model: Album }, { model: Genre }],
  });

  if (!song) {
    throw new Error("Không tìm thấy bài hát với ID này!");
  }

  if (song.is_visible === false) {
    throw new Error("Bài hát này hiện không khả dụng.");
  }

  return song;
};

// let cachedSongs = null;
// let cacheExpiredAt = 0;
// async function getSongs({ limit = 20 }) {
//   if (cachedSongs && Date.now() < cacheExpiredAt) {
//     return cachedSongs;
//   }

//   const songs = await Song.findAll({
//     where: {
//       is_visible: true,
//     },
//     order: Sequelize.literal("RAND()"),
//     limit: Number(limit),
//   });

//   cachedSongs = {
//     limit: Number(limit),
//     total: songs.length,
//     songs,
//   };

//   cacheExpiredAt = Date.now() + 1000 * 60 * 30;

//   return cachedSongs;
// }

async function getSongs({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const { rows: songs, count } = await Song.findAndCountAll({
    where: { is_visible: true },
    order: [["fetched_at", "DESC"]],
    limit: Number(limit),
    offset,
  });

  return {
    page: Number(page),
    limit: Number(limit),
    total: count,
    songs,
  };
}

const incrementSongView = async (songId) => {
  const song = await Song.findByPk(songId);

  if (!song) {
    throw new Error("Song not found");
  }

  await song.increment("view_count", { by: 1 });

  return {
    song_id: song.song_id,
    view_count: song.view_count + 1,
  };
};

/* --- CHỨC NĂNG CHO ADMIN */

const updateSongById = async (songId, updateData) => {
  const { title, artist, genre } = updateData;

  // 1. CHỈ UPDATE KHI SONG ĐÃ TỒN TẠI
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Bài hát không tồn tại trong hệ thống.");
  }

  let artistId = song.artist_id;

  // 2. Nếu admin đổi tên nghệ sĩ
  if (artist && artist.trim() !== "") {
    const artistName = artist.trim();

    let artistRecord = await Artist.findOne({
      where: { name: artistName },
    });

    // 3. Artist chưa có → tạo mới (CHO PHÉP)
    if (!artistRecord) {
      artistRecord = await Artist.create({
        name: artistName,
        jamendo_id: `manual_${Date.now()}`, // bắt buộc vì schema
        image_url: null,
      });
    }

    artistId = artistRecord.artist_id;
  }

  // 4. UPDATE SONG (KHÔNG TẠO MỚI)
  await song.update({
    title: title ?? song.title,
    genre: genre ?? song.genre,
    artist_id: artistId,
  });

  // 5. Trả về dữ liệu đầy đủ (đúng alias)
  return await Song.findByPk(song.song_id, {
    include: [
      {
        model: Artist,
        as: "artists",
        attributes: ["artist_id", "name", "image_url"],
      },
    ],
  });
};

const deleteSongById = async (songId) => {
  return sequelize.transaction(async (t) => {
    const song = await Song.findOne({
      where: { song_id: songId },
      transaction: t,
    });

    if (!song) {
      throw new Error("Không tìm thấy bài hát.");
    }

    await Favorites.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    await PlaylistSongs.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    await song.destroy({ transaction: t });

    return {
      message: "Xóa bài hát thành công.",
      song_id: songId,
      title: song.title,
    };
  });
};

const toggleSongVisibility = async (songId, adminUser) => {
  const song = await Song.findByPk(songId);
  if (!song) throw new Error("Không tìm thấy bài hát");

  song.is_visible = !song.is_visible;
  await song.save();

  return {
    songId: song.song_id,
    isVisible: song.is_visible,
    message: song.is_visible ? "Bài hát đã được HIỂN thị" : "Bài hát đã bị ẨN",
  };
};

// LIKE SONG
const likeSong = async (userId, songId) => {
  // 1. Kiểm tra bài hát tồn tại
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Không tìm thấy bài hát.");
  }

  // 2. Kiểm tra đã like chưa
  const existed = await Favorites.findOne({
    where: {
      user_id: userId,
      song_id: songId,
    },
  });

  if (existed) {
    throw new Error("Bạn đã thích bài hát này rồi.");
  }

  // 3. Tạo like
  await Favorites.create({
    user_id: userId,
    song_id: songId,
  });

  return {
    message: "Đã thích bài hát.",
    song_id: songId,
    liked: true,
  };
};

// UNLIKE SONG
const unlikeSong = async (userId, songId) => {
  // 1. Kiểm tra bài hát tồn tại
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Không tìm thấy bài hát.");
  }

  // 2. Kiểm tra đã like chưa
  const existed = await Favorites.findOne({
    where: {
      user_id: userId,
      song_id: songId,
    },
  });

  if (!existed) {
    throw new Error("Bạn chưa thích bài hát này.");
  }

  // 3. Xóa like
  await Favorites.destroy({
    where: {
      user_id: userId,
      song_id: songId,
    },
  });

  return {
    message: "Đã bỏ thích bài hát.",
    song_id: songId,
    liked: false,
  };
};

const getLikeStatus = async (userId, songId) => {
  // 1. Kiểm tra bài hát tồn tại
  const song = await Song.findByPk(songId);
  if (!song) {
    throw new Error("Không tìm thấy bài hát.");
  }

  // 2. Kiểm tra bảng favorites
  const existed = await Favorites.findOne({
    where: {
      user_id: userId,
      song_id: songId,
    },
  });

  return {
    song_id: songId,
    liked: !!existed,
  };
};

const getLikedSongs = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Song,
        as: "likedSongs",
        through: { attributes: [] },
        where: {
          is_visible: true,
        },
        required: false, // tránh lỗi nếu user chưa like bài nào
        include: [
          {
            model: Artist,
            as: "artists",
            attributes: ["name"],
          },
        ],
      },
    ],
    order: [[{ model: Song, as: "likedSongs" }, "fetched_at", "DESC"]],
  });

  if (!user) {
    throw new Error("Không tìm thấy user");
  }

  return user.likedSongs.map((song) => ({
    trackId: song.song_id,
    jamendoId: Number(song.jamendo_id),
    title: song.title,
    duration: song.duration,
    imageUrl: song.image_url,
    audioUrl: song.audio_url,
    artistName: song.artists?.name || "Unknown",
    albumName: song.album_name || null,
    genre: song.genre,
    viewCount: song.view_count,
    isVisible: song.is_visible,
    fetched_at: song.fetched_at,
  }));
};

const searchSongs = async (keyword, limit) => {
  return Song.findAll({
    where: {
      is_visible: true,
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { artist_name: { [Op.like]: `%${keyword}%` } },
        { album_name: { [Op.like]: `%${keyword}%` } },
      ],
    },
    attributes: [
      ["song_id", "trackId"],
      "title",
      ["audio_url", "audioUrl"],
      ["image_url", "imageUrl"],
      "artist_name",
      "duration",
    ],
    order: [["view_count", "DESC"]],
    limit,
  });
};

module.exports = {
  createSong,
  getAllSongs,
  getSongById,
  updateSongById,
  deleteSongById,
  toggleSongVisibility,
  getSongs,
  likeSong,
  unlikeSong,
  getLikeStatus,
  getLikedSongs,
  incrementSongView,
  searchSongs,
};
