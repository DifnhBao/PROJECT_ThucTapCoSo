const { AppError } = require("../utils/app-error");
const {
  User,
  Song,
  Artist,
  SongArtist,
  PlaylistSong,
  Genre,
  SongGenre,
  Rating,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const { publicSongWhere, requirePublicSong } = require("../policies/publication.policy");
const { AuthorizationError, requireId, requirePermission } = require("../utils/authorization");
const { isAdmin } = require("../policies/user.policy");
// const cloudinary = require("cloudinary").v2;
// const { Sequelize } = require("sequelize");
// const { v4: uuidv4 } = require("uuid");

/* --- CHỨC NĂNG CHO USER --- */

// Lấy tất cả bài hát
const normalizeName = (name) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const processManyToMany = async ({
  rawInput,
  Model,
  joinModel,
  foreignKey,
  otherKey,
  transaction,
}) => {
  if (!rawInput) return;

  const list = [
    ...new Set(
      rawInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];

  if (list.length === 0) return;

  const normalizedList = list.map((name) => ({
    original: name,
    normalized: normalizeName(name),
  }));

  // 1. Find existing
  const existing = await Model.findAll({
    where: {
      normalized_name: normalizedList.map((x) => x.normalized),
    },
    transaction,
  });

  const existingMap = new Map(
    existing.map((item) => [item.normalized_name, item]),
  );

  // 2. Create missing
  const toCreate = normalizedList
    .filter((x) => !existingMap.has(x.normalized))
    .map((x) => ({
      name: x.original,
      normalized_name: x.normalized,
    }));

  if (toCreate.length > 0) {
    await Model.bulkCreate(toCreate, {
      transaction,
      ignoreDuplicates: true,
    });
  }

  // 3. Get final (no duplicate, safe)
  const finalRecords = await Model.findAll({
    where: {
      normalized_name: normalizedList.map((x) => x.normalized),
    },
    transaction,
  });

  // 4. Insert join table
  const joinData = finalRecords.map((item) => ({
    [foreignKey]: null, // set later
    [otherKey]: item[`${Model.name.toLowerCase()}_id`],
  }));

  return finalRecords;
};

const createSong = async ({
  title,
  artist,
  genre,
  duration,
  audio_url,
  image_url,
  status,
  uploaded_by,
}, { transaction: outer } = {}) => {
  const t = outer || await sequelize.transaction();

  try {
    // 1. Create song
    const newSong = await Song.create(
      {
        title,
        duration: duration || 0,
        audio_url,
        image_url,
        view_count: 0,
        is_visible: status === "pending" ? false : true,
        status: status || "approved",
        uploaded_by: uploaded_by || null,
      },
      { transaction: t },
    );

    const songId = newSong.song_id;

    // ======================
    // 2. ARTISTS
    // ======================
    if (artist) {
      const list = [
        ...new Set(
          artist
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];

      const normalized = list.map((name) => ({
        original: name,
        normalized: normalizeName(name),
      }));

      const existing = await Artist.findAll({
        where: {
          normalized_name: normalized.map((x) => x.normalized),
        },
        transaction: t,
      });

      const map = new Map(existing.map((a) => [a.normalized_name, a]));

      const toCreate = normalized
        .filter((x) => !map.has(x.normalized))
        .map((x) => ({
          name: x.original,
          normalized_name: x.normalized,
        }));

      if (toCreate.length) {
        await Artist.bulkCreate(toCreate, {
          transaction: t,
          ignoreDuplicates: true,
        });
      }

      const finalArtists = await Artist.findAll({
        where: {
          normalized_name: normalized.map((x) => x.normalized),
        },
        transaction: t,
      });

      await SongArtist.bulkCreate(
        finalArtists.map((a) => ({
          song_id: songId,
          artist_id: a.artist_id,
        })),
        { transaction: t },
      );
    }

    // ======================
    // 3. GENRES
    // ======================
    if (genre) {
      const list = [
        ...new Set(
          genre
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];

      const normalized = list.map((name) => ({
        original: name,
        normalized: normalizeName(name),
      }));

      const existing = await Genre.findAll({
        where: {
          normalized_name: normalized.map((x) => x.normalized),
        },
        transaction: t,
      });

      const map = new Map(existing.map((g) => [g.normalized_name, g]));

      const toCreate = normalized
        .filter((x) => !map.has(x.normalized))
        .map((x) => ({
          name: x.original,
          normalized_name: x.normalized,
        }));

      if (toCreate.length) {
        await Genre.bulkCreate(toCreate, {
          transaction: t,
          ignoreDuplicates: true,
        });
      }

      const finalGenres = await Genre.findAll({
        where: {
          normalized_name: normalized.map((x) => x.normalized),
        },
        transaction: t,
      });

      await SongGenre.bulkCreate(
        finalGenres.map((g) => ({
          song_id: songId,
          genre_id: g.genre_id,
        })),
        { transaction: t },
      );
    }

    if (!outer) await t.commit();
    return newSong;
  } catch (err) {
    if (!outer && !t.finished) await t.rollback();
    throw err;
  }
};

const getAllSongs = async ({ page, limit, search }) => {
  const offset = (page - 1) * limit;

  const whereCondition = {};

  if (search) {
    whereCondition.title = {
      [Op.like]: `%${search}%`,
    };
  }

  const { rows, count } = await Song.findAndCountAll({
    where: whereCondition,
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
  return requirePublicSong(songId, {
    include: [{ model: Artist, as: "artists" }, { model: Genre, as: "genres" }],
  });
};

const getSongPreview = async (songId, actor) => {
  requirePermission(isAdmin(actor));
  const song = await Song.findByPk(requireId(songId), {
    include: [{ model: Artist, as: "artists" }, { model: Genre, as: "genres" }],
  });
  if (!song) throw new AuthorizationError("Không tìm thấy bài hát.", 404, "SONG_NOT_FOUND");
  return song;
};

async function getSongs({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const { rows: songs, count } = await Song.findAndCountAll({
    where: publicSongWhere(),
    include: [
      {
        model: Artist,
        as: "artists",
        attributes: ["name"],
        through: { attributes: [] },
      },
    ],
    order: [["created_at", "DESC"]],
    limit: Number(limit),
    offset,
    distinct: true,
  });

  return {
    page: Number(page),
    limit: Number(limit),
    total: count,
    songs,
  };
}

const incrementSongView = async (songId) => {
  const song = await requirePublicSong(songId);

  if (!song) {
    throw new AppError("Song not found", 404, "SONG_NOT_FOUND");
  }

  throw new AppError('Gửi finalized listening event để ghi nhận lượt nghe.', 410, 'VIEW_ENDPOINT_RETIRED');
};

/* --- CHỨC NĂNG CHO ADMIN */

const updateSongById = async (songId, updateData) => {
  const { title, artist, genre, is_visible, status, duration } = updateData;

  const t = await sequelize.transaction();

  try {
    const song = await Song.findByPk(songId, { transaction: t });
    if (!song) {
      throw new AppError("Bài hát không tồn tại.", 404, "SONG_NOT_FOUND");
    }

    // 1. Cập nhật thông tin cơ bản
    await song.update(
      {
        title: title ?? song.title,
        duration: duration !== undefined ? duration : song.duration,
        is_visible: is_visible !== undefined ? is_visible : song.is_visible,
        status: status ?? song.status,
      },
      { transaction: t },
    );

    // 2. Đồng bộ Artist (Many-to-Many)
    if (artist !== undefined) {
      // Xóa các liên kết cũ
      await SongArtist.destroy({ where: { song_id: songId }, transaction: t });

      const list = [
        ...new Set(
          artist
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];

      if (list.length > 0) {
        const normalized = list.map((name) => ({
          original: name,
          normalized: normalizeName(name),
        }));

        const existing = await Artist.findAll({
          where: { normalized_name: normalized.map((x) => x.normalized) },
          transaction: t,
        });

        const map = new Map(existing.map((a) => [a.normalized_name, a]));

        const toCreate = normalized
          .filter((x) => !map.has(x.normalized))
          .map((x) => ({
            name: x.original,
            normalized_name: x.normalized,
          }));

        if (toCreate.length) {
          await Artist.bulkCreate(toCreate, {
            transaction: t,
            ignoreDuplicates: true,
          });
        }

        const finalArtists = await Artist.findAll({
          where: { normalized_name: normalized.map((x) => x.normalized) },
          transaction: t,
        });

        await SongArtist.bulkCreate(
          finalArtists.map((a) => ({
            song_id: songId,
            artist_id: a.artist_id,
          })),
          { transaction: t },
        );
      }
    }

    // 3. Đồng bộ Genre (Many-to-Many)
    if (genre !== undefined) {
      // Xóa các liên kết cũ
      await SongGenre.destroy({ where: { song_id: songId }, transaction: t });

      const list = [
        ...new Set(
          genre
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ];

      if (list.length > 0) {
        const normalized = list.map((name) => ({
          original: name,
          normalized: normalizeName(name),
        }));

        const existing = await Genre.findAll({
          where: { normalized_name: normalized.map((x) => x.normalized) },
          transaction: t,
        });

        const map = new Map(existing.map((g) => [g.normalized_name, g]));

        const toCreate = normalized
          .filter((x) => !map.has(x.normalized))
          .map((x) => ({
            name: x.original,
            normalized_name: x.normalized,
          }));

        if (toCreate.length) {
          await Genre.bulkCreate(toCreate, {
            transaction: t,
            ignoreDuplicates: true,
          });
        }

        const finalGenres = await Genre.findAll({
          where: { normalized_name: normalized.map((x) => x.normalized) },
          transaction: t,
        });

        await SongGenre.bulkCreate(
          finalGenres.map((g) => ({
            song_id: songId,
            genre_id: g.genre_id,
          })),
          { transaction: t },
        );
      }
    }

    await t.commit();

    // 4. Trả về dữ liệu đầy đủ
    return await Song.findByPk(songId, {
      include: [
        {
          model: Artist,
          as: "artists",
          attributes: ["artist_id", "name"],
          through: { attributes: [] },
        },
        {
          model: Genre,
          as: "genres",
          attributes: ["genre_id", "name"],
          through: { attributes: [] },
        },
      ],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const deleteSongById = async (songId) => {
  return sequelize.transaction(async (t) => {
    const song = await Song.findByPk(songId, { transaction: t });

    if (!song) {
      throw new AppError("Không tìm thấy bài hát.", 404, "SONG_NOT_FOUND");
    }

    await SongArtist.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    await SongGenre.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    await Rating.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    // Nếu sau này bạn mở lại tính năng Playlist, hãy uncomment đoạn dưới
    await PlaylistSong.destroy({
      where: { song_id: songId },
      transaction: t,
    });

    await song.destroy({ transaction: t });

    return {
      message: "Xóa bài hát thành công.",
      song_id: songId,
      title: song.title,
      audio_url: song.audio_url,
      image_url: song.image_url,
    };
  });
};

const toggleSongVisibility = async (songId, adminUser) => {
  const song = await Song.findByPk(songId);
  if (!song) throw new AppError("Không tìm thấy bài hát", 404, "SONG_NOT_FOUND");

  song.is_visible = !song.is_visible;
  await song.save();

  return {
    songId: song.song_id,
    isVisible: song.is_visible,
    message: song.is_visible ? "Bài hát đã được HIỂN thị" : "Bài hát đã bị ẨN",
  };
};

const searchSongs = async (keyword, limit) => {
  return Song.findAll({
    where: publicSongWhere({
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { "$artists.name$": { [Op.like]: `%${keyword}%` } },
      ],
    }),

    include: [
      {
        model: Artist,
        as: "artists",
        attributes: ["artist_id", "name"],
        through: { attributes: [] },
        required: false,
      },
    ],

    order: [["view_count", "DESC"]],
    limit,
    distinct: true,
    subQuery: false,
  });
};

/* --- DUYỆT BÀI HÁT --- */

const getPendingSongs = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const { rows, count } = await Song.findAndCountAll({
    where: { status: "pending" },
    include: [
      {
        model: Artist,
        as: "artists",
        attributes: ["artist_id", "name"],
        through: { attributes: [] },
      },
      {
        model: Genre,
        as: "genres",
        attributes: ["genre_id", "name"],
        through: { attributes: [] },
      },
      {
        model: User,
        as: "uploader",
        attributes: ["user_id", "username", "email"],
      },
    ],
    order: [["created_at", "ASC"]],
    limit: Number(limit),
    offset,
    distinct: true,
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

const getPendingSongsCount = async () => {
  const count = await Song.count({ where: { status: "pending" } });
  return count;
};

const approveSong = async (songId) => {
  const song = await Song.findByPk(songId);
  if (!song) throw new AppError("Không tìm thấy bài hát.", 404, "SONG_NOT_FOUND");
  if (song.status !== "pending") throw new AppError("Bài hát không ở trạng thái chờ duyệt.", 409, "INVALID_SONG_STATE");

  await song.update({ status: "approved", is_visible: true });

  return {
    message: "Đã duyệt bài hát thành công.",
    song_id: song.song_id,
    title: song.title,
  };
};

const rejectSong = async (songId) => {
  const song = await Song.findByPk(songId);
  if (!song) throw new AppError("Không tìm thấy bài hát.", 404, "SONG_NOT_FOUND");
  if (song.status !== "pending") throw new AppError("Bài hát không ở trạng thái chờ duyệt.", 409, "INVALID_SONG_STATE");

  await song.update({ status: "rejected", is_visible: false });

  return {
    message: "Đã từ chối bài hát.",
    song_id: song.song_id,
    title: song.title,
  };
};

module.exports = {
  createSong,
  getAllSongs,
  getSongById,
  getSongPreview,
  updateSongById,
  deleteSongById,
  toggleSongVisibility,
  getSongs,
  incrementSongView,
  searchSongs,
  getPendingSongs,
  getPendingSongsCount,
  approveSong,
  rejectSong,
};
