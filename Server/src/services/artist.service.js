const { Artist, Song } = require("../models");
const sequelize = require("../config/db");

const getAllArtists = async () => {
  const artists = await Artist.findAll({
    attributes: ["artist_id", "name", "image_url"],
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["image_url"],
        required: false,
        through: { attributes: [] },
      },
    ],
    order: [["name", "ASC"]],
  });

  return artists.map((artist) => {
    const artistJson = artist.toJSON();

    return {
      artist_id: artistJson.artist_id,
      name: artistJson.name,
      image_url:
        artistJson.image_url ?? artistJson.songs?.[0]?.image_url ?? null,
    };
  });
};

const getArtistById = async (artistId) => {
  return await Artist.findByPk(artistId, {
    attributes: ["artist_id", "name", "image_url"],
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["song_id", "title", "image_url", "audio_url", "duration"],
        where: { is_visible: true },
        required: false, // artist chưa có bài vẫn trả về
      },
    ],
  });
};

// Quyền Admin: tạo nghệ sĩ mới

const createArtist = async (artistData) => {
  const { name, bio, image, country } = artistData;

  const existingArtist = await Artist.findOne({ where: { name } });
  if (existingArtist) {
    throw new Error("Nghệ sĩ này đã tồn tại.");
  }

  const newArtist = await Artist.create({
    name,
    bio,
    image,
    country,
  });

  return newArtist;
};

const getTopArtists = async (limit = 10) => {
  const artists = await Artist.findAll({
    attributes: [
      "artist_id",
      "name",
      "image_url",
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("songs.view_count")), 0), "total_listens"],
      [sequelize.fn("MAX", sequelize.col("songs.image_url")), "fallback_image"],
    ],
    include: [
      {
        model: Song,
        as: "songs",
        attributes: [],
        through: { attributes: [] },
      },
    ],
    group: ["Artist.artist_id", "Artist.name", "Artist.image_url"],
    order: [[sequelize.literal("total_listens"), "DESC"]],
    limit: limit,
    subQuery: false,
  });

  return artists.map((artist) => {
    const artistJson = artist.toJSON();
    return {
      artist_id: artistJson.artist_id,
      name: artistJson.name,
      image_url: artistJson.image_url || artistJson.fallback_image || null,
      total_listens: artistJson.total_listens,
    };
  });
};

module.exports = {
  getAllArtists,
  getArtistById,
  createArtist,
  getTopArtists,
};
