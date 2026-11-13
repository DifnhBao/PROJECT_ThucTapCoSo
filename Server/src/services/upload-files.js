const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { AppError } = require('../utils/app-error');
const root = path.resolve(__dirname, '../../public/uploads/temp', process.env.NODE_ENV === 'test' ? `test-${process.pid}` : '.');
const journal = path.resolve(__dirname, '../../.runtime', process.env.NODE_ENV === 'test' ? `upload-cleanup-test-${process.pid}.jsonl` : 'upload-cleanup.jsonl');
function safePath(filename) {
  const absolute = path.resolve(filename);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Upload path outside temp root');
  return absolute;
}
function filesOf(req) {
  const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
  const paths = new Set(files.map((f) => f.path).filter(Boolean));
  return [...files, ...[...(req.uploadTempPaths || [])].filter((p) => !paths.has(p)).map((path) => ({ path }))];
}
async function cleanup(req) {
  for (const file of filesOf(req)) {
    if (!file.path) continue;
    const filename = safePath(file.path);
    try { await fs.unlink(filename); }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      console.error(JSON.stringify({ event: 'temp_cleanup_pending', requestId: req.requestId }));
      try { await fs.mkdir(path.dirname(journal), { recursive: true }); await fs.appendFile(journal, JSON.stringify({ filename, at: new Date().toISOString() }) + '\n'); }
      catch { console.error(JSON.stringify({ event: 'cleanup_journal_failed', requestId: req.requestId })); }
    }
  }
}
async function inspect(file, kind) {
  if (!file) throw new AppError('Thiếu file upload.', 400, 'FILE_REQUIRED');
  const filename = safePath(file.path);
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 16 || stat.size > 10 * 1024 * 1024) throw new AppError('File không hợp lệ.', 413, 'INVALID_FILE_SIZE');
  const bytes = await fs.readFile(filename); // bounded by the enforced 10MiB limit
  let detected;
  try { detected = await (await import('file-type')).fileTypeFromBuffer(bytes); } catch { /* Truncated/invalid signature. */ }
  const formats = kind === 'audio' ? { mp3: ['audio/mpeg'], wav: ['audio/wav', 'audio/x-wav'], ogg: ['audio/ogg'], opus: ['audio/ogg'] } : { jpg: ['image/jpeg', 'image/jpg'], png: ['image/png'] };
  if (!detected || !formats[detected.ext]?.includes(file.mimetype)) throw new AppError('Nội dung file không khớp định dạng cho phép.', 415, 'INVALID_FILE_FORMAT');
  return { format: detected.ext === 'opus' ? 'ogg' : detected.ext, digest: createHash('sha256').update(bytes).digest('hex') };
}
async function retryTempCleanup() {
  await fs.mkdir(path.dirname(journal), { recursive: true });
  const batch = journal + '.' + require('node:crypto').randomUUID();
  try { await fs.rename(journal, batch); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const batches = (await fs.readdir(path.dirname(journal))).filter((name) => name.startsWith(path.basename(journal) + '.'));
  let pending = 0;
  for (const name of batches) {
    const filename = path.join(path.dirname(journal), name);
    for (const line of (await fs.readFile(filename, 'utf8')).split('\n').filter(Boolean)) {
      const entry = JSON.parse(line); // Malformed journal stays on disk for operator review.
      try { await fs.unlink(safePath(entry.filename)); }
      catch (error) { if (error.code !== 'ENOENT') { pending++; await fs.appendFile(journal, line + '\n'); } }
    }
    await fs.unlink(filename);
  }
  return { pending };
}
module.exports = { root, journal, safePath, cleanup, inspect, filesOf, retryTempCleanup };
