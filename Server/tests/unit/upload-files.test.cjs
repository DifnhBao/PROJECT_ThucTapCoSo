const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const files = require('../../src/services/upload-files');
const { wav, png } = require('../helpers/media-fixtures.cjs');
test('file signatures are checked by slot independently from client MIME/extension', async () => {
  await fs.mkdir(files.root, { recursive: true });
  const filename = path.join(files.root, randomUUID() + '.upload');
  try {
    await fs.writeFile(filename, wav());
    assert.equal((await files.inspect({ path: filename, mimetype: 'audio/wav' }, 'audio')).format, 'wav');
    await assert.rejects(files.inspect({ path: filename, mimetype: 'image/png' }, 'image'), { statusCode: 415 });
    await fs.writeFile(filename, png());
    assert.equal((await files.inspect({ path: filename, mimetype: 'image/png' }, 'image')).format, 'png');
    await fs.writeFile(filename, Buffer.alloc(64));
    await assert.rejects(files.inspect({ path: filename, mimetype: 'audio/mpeg' }, 'audio'), { statusCode: 415 });
  } finally { await fs.unlink(filename); }
});
test('temp cleanup failures are journaled durably and retry removes the original file', async (t) => {
  await fs.mkdir(files.root, { recursive: true });
  const filename = path.join(files.root, randomUUID() + '.upload');
  await fs.writeFile(filename, wav());
  const unlink = t.mock.method(fs, 'unlink', async () => { const error = new Error('synthetic lock'); error.code = 'EPERM'; throw error; });
  t.mock.method(console, 'error', () => {});
  await files.cleanup({ file: { path: filename }, requestId: 'fixture' });
  assert.ok((await fs.readFile(files.journal, 'utf8')).includes(filename.replaceAll('\\', '\\\\')));
  unlink.mock.restore();
  assert.equal((await files.retryTempCleanup()).pending, 0);
  await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
  assert.throws(() => files.safePath(path.resolve(files.root, '../outside.file')));
});
