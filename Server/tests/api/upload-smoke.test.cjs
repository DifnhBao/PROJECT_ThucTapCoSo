const fetch = require('../helpers/browser-fetch.cjs');
require('../helpers/mock-session-boundary.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const jwt = require('jsonwebtoken');
const { User } = require('../../src/models');
const { createApp } = require('../../src/app');
const files = require('../../src/services/upload-files');
const uploads = require('../../src/services/upload.service');
const { wav } = require('../helpers/media-fixtures.cjs');
async function setup(t) {
  t.mock.method(User, 'findByPk', async () => ({ user_id: 9, role: 'admin' }));
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening'); t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}/api/songs`, headers: { Cookie: `accessToken_admin=${jwt.sign({ userId: 9, role: 'admin', scope: 'admin' }, process.env.JWT_SECRET)}`, 'Idempotency-Key': 'fixture-upload-key' } };
}
test('real Multer passes valid audio to use case and deletes its temporary file', async (t) => {
  const { base, headers } = await setup(t);
  let filename;
  const run = t.mock.method(uploads, 'execute', async (req) => {
    filename = req.files.audioFile[0].path;
    assert.equal((await files.inspect(req.files.audioFile[0], 'audio')).format, 'wav');
    await files.cleanup(req);
    return { data: { song_id: 1 }, replayed: false };
  });
  const form = new FormData(); form.set('title', 'Fixture'); form.set('audioFile', new Blob([wav()], { type: 'audio/wav' }), 'test.wav');
  const response = await fetch(base, { method: 'POST', headers, body: form });
  assert.equal(response.status, 201); assert.equal(run.mock.callCount(), 1);
  await assert.rejects(fs.stat(filename), { code: 'ENOENT' });
});
test('invalid metadata is rejected and cleaned before upload use case', async (t) => {
  const { base, headers } = await setup(t);
  const run = t.mock.method(uploads, 'execute', async () => { throw new Error('must not run'); });
  const unlink = t.mock.method(fs, 'unlink');
  const form = new FormData(); form.set('title', 'Fixture'); form.set('role', 'super_admin'); form.set('audioFile', new Blob([wav()], { type: 'audio/wav' }), 'test.wav');
  assert.equal((await fetch(base, { method: 'POST', headers, body: form })).status, 400);
  assert.equal(run.mock.callCount(), 0);
  assert.ok(unlink.mock.callCount() >= 1);
});

test('aborting a multipart stream removes the in-progress file before use case starts', { timeout: 10000 }, async (t) => {
  const { base, headers } = await setup(t);
  const run = t.mock.method(uploads, 'execute', async () => { throw new Error('must not run'); });
  const http = require('node:http');
  const request = http.request(base, { method: 'POST', headers: { ...headers, Origin: 'http://localhost:3000', 'Content-Type': 'multipart/form-data; boundary=fixtureboundary' } });
  request.on('error', () => {});
  request.write('--fixtureboundary\r\nContent-Disposition: form-data; name="title"\r\n\r\nFixture\r\n--fixtureboundary\r\nContent-Disposition: form-data; name="audioFile"; filename="fixture.wav"\r\nContent-Type: audio/wav\r\n\r\n');
  request.write(wav()); request.write(Buffer.alloc(65536));
  let seen = false;
  for (let i = 0; i < 100; i++) {
    if ((await fs.readdir(files.root).catch(() => [])).length) { seen = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(seen); request.destroy();
  for (let i = 0; i < 100; i++) {
    if (!(await fs.readdir(files.root)).length) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.deepEqual(await fs.readdir(files.root), []);
  assert.equal(run.mock.callCount(), 0);
});
