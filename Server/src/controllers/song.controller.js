const songService = require("../services/song.service");
const cloudinary = require("cloudinary").v2;
const fs = require("fs-extra");
const { Song, User } = require("../models");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* --- CONTROLLER FOR USER --- */

// const createSong = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       throw new Error("Bạn phải upload một file nhạc!");
//     }

//     const songData = req.body;
//     const tempFilePath = req.file.path;

//     const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
//       folder: "music-app/songs",
//       resource_type: "video",
//     });

//     const audioUrl = uploadResult.secure_url;

//     await fs.unlink(tempFilePath);

//     const newSong = await songService.createSong(songData, audioUrl);

//     res.status(201).json({ message: "Upload THÀNH CÔNG!", data: newSong });
//   } catch (error) {
//     console.error("LỖI BÊN TRONG SONG CONTROLLER:", error);
//     next(error);
//   }
// };

const createSong = async (req, res, next) => {
  try {
    const { title, artist, genre, duration } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Thiếu title" });
    }

    const audioFile = req.files?.audioFile?.[0];
    const imageFile = req.files?.imageFile?.[0];

    if (!audioFile) {
      return res.status(400).json({ message: "Thiếu file audio" });
    }

    // upload audio
    const audioUpload = await cloudinary.uploader.upload(audioFile.path, {
      folder: "music/audio",
      resource_type: "video",
    });

    // upload image (optional)
    let imageUrl = null;
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        folder: "music/image",
      });
      imageUrl = imageUpload.secure_url;
    }

    // xóa file local
    await fs.unlink(audioFile.path);
    if (imageFile) await fs.unlink(imageFile.path);

    const newSong = await songService.createSong({
      title,
      artist,
      genre,
      duration,
      audio_url: audioUpload.secure_url,
      image_url: imageUrl,
    });

    res.status(201).json({
      message: "Upload thành công",
      data: newSong,
    });
  } catch (err) {
    next(err);
  }
};

const userUploadSong = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Kiểm tra user đã cập nhật thông tin cá nhân chưa
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    if (!user.first_name || !user.last_name) {
      return res.status(403).json({
        message:
          "Bạn cần cập nhật thông tin cá nhân trước khi đăng bài hát. Vui lòng vào trang Hồ sơ để cập nhật.",
      });
    }

    const { title, genre, duration, artist } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Thiếu tên bài hát." });
    }

    const audioFile = req.files?.audioFile?.[0];
    const imageFile = req.files?.imageFile?.[0];

    if (!audioFile) {
      return res.status(400).json({ message: "Thiếu file nhạc." });
    }

    // Upload audio lên Cloudinary
    const audioUpload = await cloudinary.uploader.upload(audioFile.path, {
      folder: "music/audio",
      resource_type: "video",
    });

    // Upload image (optional)
    let imageUrl = null;
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        folder: "music/image",
      });
      imageUrl = imageUpload.secure_url;
    }

    // Xóa file tạm
    await fs.unlink(audioFile.path);
    if (imageFile) await fs.unlink(imageFile.path);

    // Artist: dùng input của user, fallback về username
    const artistName = (artist && artist.trim()) ? artist.trim() : user.username;

    const newSong = await songService.createSong({
      title,
      artist: artistName,
      genre: genre || "",
      duration: duration || 0,
      audio_url: audioUpload.secure_url,
      image_url: imageUrl,
      status: "pending",
      uploaded_by: userId,
    });

    res.status(201).json({
      message: "Bài hát đã được gửi và đang chờ quản trị viên duyệt!",
      data: newSong,
    });
  } catch (err) {
    // Cleanup files nếu có lỗi
    if (req.files?.audioFile?.[0]?.path) {
      try { await fs.unlink(req.files.audioFile[0].path); } catch {}
    }
    if (req.files?.imageFile?.[0]?.path) {
      try { await fs.unlink(req.files.imageFile[0].path); } catch {}
    }
    next(err);
  }
};

const getAllSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const result = await songService.getAllSongs({
      page,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bài hát thành công.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const song = await songService.getSongById(id);
    res.status(200).json({
      message: "Lấy bài hát thành công!",
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

async function getSongList(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await songService.getSongs({ page, limit });

    res.json(result);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const increaseView = async (req, res) => {
  try {
    const { songId } = req.params;

    // Chỉ tăng view trong MySQL
    const result = await songService.incrementSongView(songId);

    return res.status(200).json({
      success: true,
      message: "View increased in MySQL",
      data: result,
    });
  } catch (error) {
    console.error("IncreaseView Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* --- CONTROLLER FOR ADMIN */

const updateSongById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedSong = await songService.updateSongById(id, updateData);

    res.status(200).json({
      message: "Admin cập nhật thành công.",
      data: updatedSong,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSongById = async (req, res, next) => {
  try {
    const rawId = req.params.id;

    // 1. Kiểm tra tồn tại param
    if (!rawId) {
      return res.status(400).json({
        message: "Thiếu ID bài hát.",
      });
    }

    // 2. Ép kiểu + validate
    const songId = parseInt(rawId, 10);

    if (!Number.isInteger(songId) || songId <= 0) {
      return res.status(400).json({
        message: "ID bài hát không hợp lệ.",
      });
    }

    // 3. Gọi service
    const result = await songService.deleteSongById(songId);

    // 4. Xóa file trên Cloudinary
    const extractPublicId = (url) => {
      if (!url) return null;
      const uploadIndex = url.indexOf('/upload/');
      if (uploadIndex === -1) return null;
      let path = url.substring(uploadIndex + 8);
      const versionRegex = /^v\d+\//;
      path = path.replace(versionRegex, '');
      const lastDotIndex = path.lastIndexOf('.');
      return lastDotIndex !== -1 ? path.substring(0, lastDotIndex) : path;
    };

    if (result.audio_url) {
      const audioId = extractPublicId(result.audio_url);
      if (audioId) {
        await cloudinary.uploader.destroy(audioId, { resource_type: "video" })
          .catch(err => console.error("Lỗi xóa audio trên Cloudinary:", err));
      }
    }

    if (result.image_url) {
      const imageId = extractPublicId(result.image_url);
      if (imageId) {
        await cloudinary.uploader.destroy(imageId)
          .catch(err => console.error("Lỗi xóa image trên Cloudinary:", err));
      }
    }

    res.status(200).json(result);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        message: error.message,
      });
    }

    // Các lỗi khác (ví dụ lỗi DB) đẩy cho middleware xử lý lỗi tổng của Express
    next(error);
  }
};

const toggleSongVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.toggleSongVisibility(id);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const searchSongs = async (req, res) => {
  try {
    const { q = "", limit = 10 } = req.query;

    if (!q.trim()) {
      return res.json({ data: [] });
    }

    const songs = await songService.searchSongs(q, Number(limit));
    res.json({ data: songs });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};

/* --- DUYỆT BÀI HÁT (ADMIN) --- */
const getPendingSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await songService.getPendingSongs({ page, limit });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getPendingSongsCount = async (req, res, next) => {
  try {
    const count = await songService.getPendingSongsCount();
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

const approveSong = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.approveSong(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const rejectSong = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await songService.rejectSong(id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSong,
  userUploadSong,
  getAllSongs,
  getSongById,
  updateSongById,
  deleteSongById,
  toggleSongVisibility,
  getSongList,
  increaseView,
  searchSongs,
  getPendingSongs,
  getPendingSongsCount,
  approveSong,
  rejectSong,
};
