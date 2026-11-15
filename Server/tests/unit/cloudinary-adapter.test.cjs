const { test } = require('node:test');
const assert = require('node:assert/strict');
const cloud = require('cloudinary').v2;
const storage = require('../../src/storage/cloudinary');
const asset = { public_id: 'tunetrek/fixture', resource_type: 'video', delivery_type: 'authenticated', format: 'wav' };
test('Cloudinary adapter uploads/destroys exact private asset identity and never infers IDs from URLs', async (t) => {
  const upload = t.mock.method(cloud.uploader, 'upload', async () => ({}));
  const destroy = t.mock.method(cloud.uploader, 'destroy', async () => ({ result: 'ok' }));
  await storage.upload('fixture.wav', asset); await storage.destroy(asset);
  assert.equal(upload.mock.calls[0].arguments[1].public_id, asset.public_id);
  assert.equal(upload.mock.calls[0].arguments[1].overwrite, false);
  assert.equal(upload.mock.calls[0].arguments[1].type, 'authenticated');
  assert.deepEqual(destroy.mock.calls[0].arguments, [asset.public_id, { resource_type: 'video', type: 'authenticated', invalidate: true, timeout: 60000 }]);
  destroy.mock.mockImplementation(async () => ({ result: 'unknown' }));
  await assert.rejects(storage.destroy(asset));
});
test('Cloudinary read URL is short-lived/server-only and forwards only the validated Range', async (t) => {
  const url = t.mock.method(cloud.utils, 'private_download_url', () => 'https://api.cloudinary.com/synthetic-download');
  const read = t.mock.method(globalThis, 'fetch', async () => new Response('fixture'));
  await storage.read(asset, 'bytes=0-15');
  const options = url.mock.calls[0].arguments[2];
  assert.equal(options.type, 'authenticated'); assert.equal(options.resource_type, 'video'); assert.equal(options.attachment, false);
  assert.ok(options.expires_at <= Math.floor(Date.now() / 1000) + 120);
  assert.deepEqual(read.mock.calls[0].arguments[1].headers, { Range: 'bytes=0-15' });
  assert.equal(read.mock.calls[0].arguments[1].redirect, 'error');
});
