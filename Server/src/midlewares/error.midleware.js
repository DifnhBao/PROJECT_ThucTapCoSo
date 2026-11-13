const multer = require('multer');
const { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } = require('sequelize');
const { AppError } = require('../utils/app-error');

function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let error = err;
  if (!(error instanceof AppError)) {
    if (err?.type === 'entity.parse.failed') error = new AppError('JSON không hợp lệ.', 400, 'INVALID_JSON');
    else if (err instanceof URIError) error = new AppError('URL không hợp lệ.', 400, 'INVALID_URL');
    else if (err?.type === 'entity.too.large') error = new AppError('Request quá lớn.', 413, 'PAYLOAD_TOO_LARGE');
    else if (['charset.unsupported', 'encoding.unsupported'].includes(err?.type)) error = new AppError('Encoding không được hỗ trợ.', 415, 'UNSUPPORTED_ENCODING');
    else if (['request.aborted', 'request.size.invalid'].includes(err?.type)) error = new AppError('Request không hợp lệ.', 400, 'INVALID_REQUEST');
    else if (err instanceof multer.MulterError) error = new AppError('Upload không hợp lệ hoặc vượt giới hạn.', err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'INVALID_UPLOAD');
    else if (err instanceof UniqueConstraintError) error = new AppError('Dữ liệu đã tồn tại.', 409, 'DUPLICATE_RESOURCE');
    else if (err instanceof ForeignKeyConstraintError) error = new AppError('Dữ liệu liên quan không tồn tại hoặc đang được sử dụng.', 409, 'REFERENCE_CONFLICT');
    else if (err instanceof ValidationError) error = new AppError('Dữ liệu không hợp lệ.', 422, 'INVALID_RESOURCE');
    else error = new AppError('Có lỗi xảy ra phía server.', 500, 'INTERNAL_ERROR');
  }
  if (error.statusCode >= 500) {
    // Never serialize the original exception: SQL, parameters, bodies and credentials stay out of logs/responses.
    console.error(JSON.stringify({ requestId: req.requestId, code: 'INTERNAL_ERROR', event: 'request_failed' }));
    if (!(error.statusCode === 503 && error.code === 'UPLOAD_STATE_UNKNOWN') && !(error.statusCode === 502 && error.code === 'MEDIA_UNAVAILABLE')) {
      error = new AppError('Có lỗi xảy ra phía server.', 500, 'INTERNAL_ERROR');
    }
  }
  res.status(error.statusCode).json({ error: { code: error.code, message: error.message, details: error.details }, requestId: req.requestId });
}
module.exports = globalErrorHandler;
