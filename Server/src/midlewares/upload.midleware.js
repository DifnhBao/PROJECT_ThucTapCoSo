const multer = require('multer');
const fs = require('fs');
const { AppError } = require('../utils/app-error');

const { root: tempDir, cleanup } = require('../services/upload-files');

const storage = {
  _handleFile(req, file, callback) {
    fs.mkdir(tempDir, { recursive: true }, (error) => {
      if (error || req.aborted) return callback(error || new Error('Upload aborted'));
      const filename = require('node:crypto').randomUUID() + '.upload';
      const absolute = require('node:path').join(tempDir, filename);
      req.uploadTempPaths ||= new Set(); req.uploadTempPaths.add(absolute);
      const output = fs.createWriteStream(absolute, { flags: 'wx' });
      const abort = () => { file.stream.destroy(new Error('Upload aborted')); };
      req.once('aborted', abort);
      require('node:stream').pipeline(file.stream, output, async (failure) => {
        req.removeListener('aborted', abort);
        if (failure) { await cleanup(req); return callback(failure); }
        callback(null, { destination: tempDir, filename, path: absolute, size: output.bytesWritten });
      });
    });
  },
  _removeFile(req, file, callback) {
    fs.unlink(file.path, (error) => callback(error?.code === 'ENOENT' ? null : error));
  },
};

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const accepted = file.fieldname === 'audioFile' ? ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'] : ['image/jpeg', 'image/png', 'image/jpg'];
        if (accepted.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError('Định dạng file không hợp lệ.', 415, 'UNSUPPORTED_MEDIA_TYPE'), false);
        }
    },
    limits: { fileSize: 1024 * 1024 * 10, files: 2, fields: 10, parts: 12, fieldSize: 16 * 1024, fieldNameSize: 100, headerPairs: 100 },
});

const wrap = (parser) => (req, res, next) => {
  res.once('close', () => { void cleanup(req); });
  parser(req, res, async (error) => {
    if (error) { await cleanup(req); return next(error); }
    next();
  });
};
module.exports = { fields: (fields) => wrap(upload.fields(fields)), single: (field) => wrap(upload.single(field)) };
