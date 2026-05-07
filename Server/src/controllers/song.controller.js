const songService = require("../services/song.service");
const cloudinary = require("cloudinary").v2;
const fs = require("fs-extra");
const { Song, User } = require("../models");
const UserActivity = require("../models/mongo/UserActivity");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const NodeID3 = require("node-id3");
const path = require("path");


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

/* --- HÀM MỚI: AUTO-UPLOAD BẰNG AI CÓ TRÍCH XUẤT ẢNH --- */
const autoUploadSongs = async (req, res, next) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Không có file nhạc nào được chọn." });
    }

    const results = { successful: [], failed: [] };

    for (const file of files) {
      try {
        const filename = file.originalname;
        let finalImageUrl = null; // Mặc định là null nếu MP3 không có ảnh

        // 1. TRÍCH XUẤT ẢNH TỪ MP3
        const tags = NodeID3.read(file.path);
        if (tags.image && tags.image.imageBuffer) {
          // Tạo một đường dẫn file ảnh tạm thời
          const tempImagePath = path.join(__dirname, `../uploads/temp_image_${Date.now()}.jpg`);

          // Ghi buffer ảnh ra file vật lý
          await fs.writeFile(tempImagePath, tags.image.imageBuffer);

          // Upload ảnh lên Cloudinary
          const imgUploadResult = await cloudinary.uploader.upload(tempImagePath, {
            folder: "music/images",
          });

          finalImageUrl = imgUploadResult.secure_url;

          // Xóa file ảnh tạm
          await fs.unlink(tempImagePath);
        }

        // 2. Nhờ Groq AI phân tích tên file để lấy metadata
        const prompt = `
        Dựa vào tên file nhạc sau: "${fileName}".
        Hãy phân tích và trả về đúng định dạng JSON với các key sau:
        - "title": Tên bài hát.
        - "artists": Tên ca sĩ (nếu nhiều ca sĩ, ngăn cách bằng dấu phẩy).
        - "genres": Thể loại nhạc (Pop, Rap, Ballad, R&B...). LƯU Ý QUAN TRỌNG: Nếu có nhiều thể loại, BẮT BUỘC phải ngăn cách bằng dấu phẩy (,). Ví dụ ĐÚNG: "V-Pop, Ballad, Rap". Ví dụ SAI: "V-Pop Ballad". Tuyệt đối không viết liền.
        - "duration": ${duration}
        `;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);

        // 3. Upload file Audio lên Cloudinary
        const audioUploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "music/audio",
          resource_type: "video",
        });

        // 4. Xóa file audio tạm
        await fs.unlink(file.path);

        // 5. Lưu Database MySQL
        const newSong = await songService.createSong({
          title: aiResponse.title || "Unknown Title",
          artist: aiResponse.artist || "Unknown Artist",
          genre: aiResponse.genre || "Unknown",
          duration: Math.round(audioUploadResult.duration) || 0,
          audio_url: audioUploadResult.secure_url,
          image_url: finalImageUrl, // Bơm link ảnh vừa trích xuất vào đây!
        });

        results.successful.push({ filename, song: newSong });
      } catch (err) {
        console.error(`Lỗi bài ${file.originalname}:`, err);
        results.failed.push({ filename: file.originalname, error: err.message });
        if (await fs.pathExists(file.path)) await fs.unlink(file.path);
      }
    }

    res.status(200).json({
      message: `Đã xử lý xong ${files.length} bài hát.`,
      data: results
    });

  } catch (error) {
    next(error);
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
    const userId = req.user.userId;

    const result = await songService.incrementSongView(songId);

    // Lưu lịch sử hành vi vào UserActivity
    const activity = new UserActivity({
      user_id: userId,
      song_id: parseInt(songId, 10),
      action: "play",
      duration_listened: 0,
      completion_rate: 0,
      is_view: false,
    });
    await activity.save();

    return res.status(200).json({
      success: true,
      message: "View increased",
      data: result,
    });
  } catch (error) {
    return res.status(404).json({
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

module.exports = {
  createSong,
  autoUploadSongs,
  getAllSongs,
  getSongById,
  updateSongById,
  deleteSongById,
  toggleSongVisibility,
  getSongList,
  // likeSong,
  // unlikeSong,
  // getLikeStatus,
  // getLikedSongs,
  increaseView,
  // logSongActivity,
  searchSongs,
};
