const { Artist, Song } = require("../models");

const getAllArtists = async () => {
  const artists = await Artist.findAll({
    attributes: ["artist_id", "name", "image_url"],
    include: [
      {
        model: Song,
        as: "songs",
        attributes: ["image_url"],
        required: false, // artist không có bài vẫn hiện
        limit: 1, // chỉ cần 1 bài
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

module.exports = {
  getAllArtists,
  getArtistById,
  createArtist,
};
