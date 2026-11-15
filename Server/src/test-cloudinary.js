const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: __dirname + '/../.env' });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.uploader.upload(
    './testnnca.mp3', // file mp3 mẫu trong cùng thư mục
    { resource_type: 'auto', folder: 'music-app/test' },
    (error, result) => {
        if (error) console.error('❌ Lỗi upload Cloudinary:', error);
        else console.log('✅ Upload Cloudinary thành công:', result.url);
    }
);
