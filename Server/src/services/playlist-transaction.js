const { UniqueConstraintError } = require('sequelize');
const { sequelize } = require('../models');
const { AppError } = require('../utils/app-error');

// Retry only MySQL's known lock failures after managed rollback. Never retry an
// ambiguous COMMIT/network error or a domain error as another mutation.
async function playlistTransaction(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await sequelize.transaction(work); }
    catch (error) {
      if (error instanceof UniqueConstraintError) throw new AppError('Playlist vừa thay đổi; tải lại rồi thử lại.', 409, 'PLAYLIST_CONFLICT');
      const errno = error.original?.errno ?? error.parent?.errno;
      if (![1205, 1213].includes(errno)) throw error;
      if (attempt === 2) throw new AppError('Playlist đang bận. Vui lòng thử lại.', 409, 'PLAYLIST_BUSY');
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}
module.exports = { playlistTransaction };
