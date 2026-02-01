const multer = require('multer');

const globalErrorHandler = (err, req, res, next) => {
    console.error("--- LỖI TOÀN CỤC ĐÃ BẮT ĐƯỢC ---");
    console.error("Đối tượng lỗi (err):", err);

    let errorMessage = "Đã có lỗi xảy ra nhưng không rõ nguyên nhân.";
    let statusCode = 500;

    if (err) {
        if (typeof err === 'object' && err.message) {
            errorMessage = err.message;
        } else if (err instanceof Error) {
            errorMessage = err.message;
        } else if (typeof err === 'string') {
            errorMessage = err;
        }
    }


    // 1. Lỗi Multer (Giữ nguyên)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File quá lớn, chỉ cho phép dưới 10MB.' });
        }
    }

    // 2. Lỗi Validation (400 - Lỗi do người dùng)
    const userErrorMessages = [
        'Mật khẩu mới không được trùng với mật khẩu cũ',
        'Mật khẩu cũ không chính xác',
        'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới',
        'Email này đã được sử dụng',
        'Username này đã được sử dụng',
        'Tên nghệ sĩ này đã tồn tại',
        'Tên thể loại này đã tồn tại',
        'Định dạng file không hợp lệ',
        'Thiếu "songId" trong body',
    ];

    if (userErrorMessages.some(msg => errorMessage.includes(msg))) {
        statusCode = 400;
        return res.status(statusCode).json({ message: errorMessage });
    }

    // 3. Lỗi "Không tìm thấy" (404)
    const notFoundMessages = [
        'Không tìm thấy người dùng',
        'Không tìm thấy bài hát',
        'Không tìm thấy nghệ sĩ',
        'Không tìm thấy playlist',
        'Không tìm thấy ID này',
    ];

    if (notFoundMessages.some(msg => errorMessage.includes(msg))) {
        statusCode = 404;
        return res.status(statusCode).json({ message: errorMessage });
    }


    return res.status(statusCode).json({
        message: "Có lỗi xảy ra phía server!",
        error: errorMessage
    });
};

module.exports = globalErrorHandler;