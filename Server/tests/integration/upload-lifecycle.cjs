const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { User, Song, Artist, SongArtist, UploadReceipt, MediaAsset, sequelize } = require('../../src/models');
const auth = require('../../src/services/auth.service');
const uploads = require('../../src/services/upload.service');
const storage = require('../../src/storage/cloudinary');
const files = require('../../src/services/upload-files');
const { wav, png } = require('../helpers/media-fixtures.cjs');
const { getSecurityConfig } = require('../../src/config/security');
const fetch = require('../helpers/browser-fetch.cjs');
module.exports = async function uploadLifecycle(t) {
  const remote = new Set(), deleted = [];
  let failImage = false, failDestroy = false, pause, entered;
  const send = t.mock.method(storage, 'upload', async (filename, asset) => {
    assert.equal(asset.delivery_type, 'authenticated');
    // Network side effects run outside transactions (can acquire another DB connection).
    remote.add(asset.public_id);
    if (pause) { const wait = pause; pause = undefined; entered(); await wait; }
    if (failImage && asset.resource_type === 'image') throw new Error('synthetic ambiguous image upload failure');
  });
  t.mock.method(storage, 'destroy', async (asset) => {
    if (failDestroy) throw new Error('synthetic cleanup unavailable');
    remote.delete(asset.public_id); deleted.push([asset.public_id, asset.resource_type, asset.delivery_type]);
  });
  const read = t.mock.method(storage, 'read', async (asset, range) => new Response(range ? wav().subarray(0, 16) : wav(), { status: range ? 206 : 200, headers: range ? { 'Content-Range': 'bytes 0-15/60', 'Accept-Ranges': 'bytes' } : {} }));
  const app = require('../../src/app').createApp({ securityConfig: getSecurityConfig({ ...process.env, RATE_UPLOAD_MAX: '100', RATE_API_MAX: '1000' }) });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const password = process.env.TEST_SEED_PASSWORD;
  const admin = await auth.loginAdmin({ username: 'demo_admin', password });
  const user = await auth.loginUser({ username: 'demo_userA', password });
  const headers = (scope) => ({ Cookie: `${scope === 'admin' ? 'accessToken_admin' : 'accessToken'}=${scope === 'admin' ? admin.tokens.accessToken : user.tokens.accessToken}` });
  const form = ({ title = 'T08 fixture', image = false, bytes = wav(), mime = 'audio/wav' } = {}) => {
    const data = new FormData();
    if (title !== null) data.set('title', title);
    data.set('artist', 'T08 Artist'); data.set('genre', 'T08 Genre');
    data.set('audioFile', new Blob([bytes], { type: mime }), 'fixture.wav');
    if (image) data.set('imageFile', new Blob([png()], { type: 'image/png' }), 'fixture.png');
    return data;
  };
  const post = (data, key = randomUUID(), scope = 'admin', signal) => fetch(base + (scope === 'admin' ? '/songs' : '/songs/upload'), { method: 'POST', headers: { ...headers(scope), ...(key ? { 'Idempotency-Key': key } : {}) }, body: data, signal });
  const noTemp = async () => { const remaining = await fs.readdir(files.root).catch((e) => e.code === 'ENOENT' ? [] : Promise.reject(e)); assert.deepEqual(remaining, []); };

  await t.test('preflight rejects missing key/profile before disk; invalid metadata/signature/size leave no files', async () => {
    const before = send.mock.callCount();
    assert.equal((await post(form(), null)).status, 400);
    await User.update({ first_name: null, last_name: null }, { where: { user_id: 1 } });
    assert.equal((await post(form(), randomUUID(), 'user')).status, 403);
    assert.equal((await post(form({ title: null }))).status, 400);
    assert.equal((await post(form({ bytes: Buffer.alloc(64), mime: 'audio/mpeg' }))).status, 415);
    assert.equal((await post(form({ bytes: png(), mime: 'audio/mpeg' }))).status, 415);
    assert.equal((await post(form({ bytes: Buffer.alloc(11 * 1024 * 1024) }))).status, 413);
    assert.equal(send.mock.callCount(), before); await noTemp();
    await User.update({ first_name: 'Fixture', last_name: 'User' }, { where: { user_id: 1 } });
  });

  await t.test('audio success + ambiguous image failure destroys both known provider IDs', async () => {
    const count = await Song.count(), prior = new Set(remote);
    failImage = true;
    assert.equal((await post(form({ image: true }))).status, 500);
    failImage = false;
    assert.equal(await Song.count(), count); assert.deepEqual(remote, prior);
    assert.ok(deleted.some(([, type, delivery]) => type === 'video' && delivery === 'authenticated'));
    assert.ok(deleted.some(([, type, delivery]) => type === 'image' && delivery === 'authenticated'));
    await noTemp();
  });

  await t.test('relation DB failure rolls back song/relations/artists and compensates cloud assets', async (context) => {
    const count = await Song.count(), artistCount = await Artist.count(), prior = new Set(remote);
    const insert = context.mock.method(SongArtist, 'bulkCreate', async () => { throw new Error('synthetic join failure'); });
    assert.equal((await post(form({ image: true }))).status, 500);
    insert.mock.restore();
    assert.equal(await Song.count(), count); assert.equal(await Artist.count(), artistCount);
    assert.deepEqual(remote, prior); await noTemp();
  });

  await t.test('cleanup failure is durable and blocks same-key retry until cleanup succeeds', async () => {
    const key = randomUUID(), count = await Song.count();
    failImage = true; failDestroy = true;
    assert.equal((await post(form({ image: true }), key)).status, 500);
    failImage = false;
    const pending = await MediaAsset.count({ where: { state: 'cleanup_pending' } });
    assert.ok(pending >= 2);
    const blocked = await post(form({ image: true }), key);
    assert.equal(blocked.status, 409); assert.equal((await blocked.json()).error.code, 'UPLOAD_CLEANUP_PENDING');
    failDestroy = false; await uploads.retryCleanup();
    assert.equal(await MediaAsset.count({ where: { state: 'cleanup_pending' } }), 0);
    assert.equal((await post(form({ image: true }), key)).status, 201);
    assert.equal(await Song.count(), count + 1); await noTemp();
  });

  await t.test('success and replay are atomic, payload conflicts reject, and no post-commit song read is needed', async (context) => {
    const key = randomUUID(), count = await Song.count(), calls = send.mock.callCount();
    const readFailure = context.mock.method(Song, 'findByPk', async () => { throw new Error('synthetic response hydrate failure'); });
    const first = await post(form(), key); assert.equal(first.status, 201);
    const firstBody = await first.json();
    const second = await post(form(), key); assert.equal(second.status, 200);
    assert.equal(second.headers.get('Idempotency-Replayed'), 'true');
    assert.deepEqual((await second.json()).data.data, firstBody.data.data);
    assert.equal((await post(form({ title: 'different payload' }), key)).status, 409);
    assert.equal(readFailure.mock.callCount(), 0);
    readFailure.mock.restore();
    assert.equal(await Song.count(), count + 1); assert.equal(send.mock.callCount(), calls + 1); await noTemp();
  });

  await t.test('concurrent same-key upload has one owner and no duplicate asset', async () => {
    const key = randomUUID(), count = await Song.count(), calls = send.mock.callCount();
    pause = new Promise((resolve) => { entered = resolve; });
    let resume; const started = pause; pause = new Promise((resolve) => { resume = resolve; });
    const first = post(form(), key); await started;
    const second = await post(form(), key); assert.equal(second.status, 409);
    assert.equal((await second.json()).error.code, 'UPLOAD_IN_PROGRESS');
    resume(); assert.equal((await first).status, 201);
    assert.equal(await Song.count(), count + 1); assert.equal(send.mock.callCount(), calls + 1); await noTemp();
  });

  await t.test('lost response after request upload can replay the committed result safely', async () => {
    const key = randomUUID(), count = await Song.count(), calls = send.mock.callCount();
    let begin, resume; const started = new Promise((resolve) => { begin = resolve; });
    entered = begin; pause = new Promise((resolve) => { resume = resolve; });
    const controller = new AbortController();
    const abandoned = post(form(), key, 'admin', controller.signal).catch(() => null);
    await started; controller.abort(); resume(); await abandoned;
    const hash = require('node:crypto').createHash('sha256').update(key).digest('hex');
    let saved;
    for (let i = 0; i < 100; i++) {
      saved = await UploadReceipt.findOne({ where: { user_id: 3, key_digest: hash } });
      if (saved?.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(saved.status, 'completed');
    assert.equal((await post(form(), key)).status, 200);
    assert.equal(await Song.count(), count + 1); assert.equal(send.mock.callCount(), calls + 1); await noTemp();
  });

  await t.test('pending media stays private; admin preview/publication/hide gate every stream, including Range', async () => {
    const result = await post(form(), randomUUID(), 'user'); assert.equal(result.status, 201);
    const song = (await result.json()).data.data;
    assert.equal(song.status, 'pending'); assert.equal(song.is_visible, false);
    assert.match(song.audio_url, /^\/api\/media\/[0-9a-f-]{36}$/);
    const before = read.mock.callCount();
    assert.equal((await fetch(base.replace(/\/api$/, '') + song.audio_url)).status, 404);
    assert.equal((await fetch(base.replace(/\/api$/, '') + song.audio_url, { headers: headers('user') })).status, 404);
    assert.equal(read.mock.callCount(), before);
    const preview = await fetch(base.replace(/\/api$/, '') + song.audio_url, { headers: { ...headers('admin'), Range: 'bytes=0-15' } });
    assert.equal(preview.status, 206); assert.equal((await preview.arrayBuffer()).byteLength, 16);
    assert.equal(preview.headers.get('Cache-Control'), 'private, no-store');
    await Song.update({ status: 'approved', is_visible: true }, { where: { song_id: song.song_id } });
    const publicRead = await fetch(base.replace(/\/api$/, '') + song.audio_url); assert.equal(publicRead.status, 200); await publicRead.arrayBuffer();
    const expiredCookie = await fetch(base.replace(/\/api$/, '') + song.audio_url, { headers: { Cookie: 'accessToken=expired-or-invalid-cookie' } });
    assert.equal(expiredCookie.status, 200); await expiredCookie.arrayBuffer();
    await Song.update({ is_visible: false }, { where: { song_id: song.song_id } });
    assert.equal((await fetch(base.replace(/\/api$/, '') + song.audio_url)).status, 404);
    await noTemp();
  });

  await t.test('lost DB commit acknowledgement preserves committed assets and replays its receipt', async (context) => {
    const count = await Song.count(), calls = send.mock.callCount(), deletes = deleted.length;
    const original = sequelize.transaction.bind(sequelize);
    let transactions = 0;
    const transaction = context.mock.method(sequelize, 'transaction', async (...args) => {
      const result = await original(...args);
      if (++transactions === 2) throw new Error('synthetic lost commit acknowledgement');
      return result;
    });
    const result = await post(form(), randomUUID());
    assert.equal(result.status, 200); assert.equal(result.headers.get('Idempotency-Replayed'), 'true');
    transaction.mock.restore();
    assert.equal(await Song.count(), count + 1); assert.equal(send.mock.callCount(), calls + 1); assert.equal(deleted.length, deletes);
    await noTemp();
  });

  await t.test('unknown commit state returns503 without deleting potentially adopted assets; retry resolves it', async (context) => {
    const key = randomUUID(), count = await Song.count(), deletes = deleted.length;
    const original = sequelize.transaction.bind(sequelize), lookup = UploadReceipt.findByPk.bind(UploadReceipt);
    let transactions = 0, unavailable = false;
    const transaction = context.mock.method(sequelize, 'transaction', async (...args) => {
      const result = await original(...args);
      if (++transactions === 2) { unavailable = true; throw new Error('synthetic commit uncertainty'); }
      return result;
    });
    const read = context.mock.method(UploadReceipt, 'findByPk', async (...args) => { if (unavailable && !args[1]?.transaction) throw new Error('synthetic DB unavailable'); return lookup(...args); });
    const result = await post(form(), key); assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, 'UPLOAD_STATE_UNKNOWN');
    transaction.mock.restore(); read.mock.restore();
    assert.equal(deleted.length, deletes); assert.equal(await Song.count(), count + 1);
    assert.equal((await post(form(), key)).status, 200); assert.equal(await Song.count(), count + 1); await noTemp();
  });

  await t.test('operator recovery drains stale planned assets after writers are stopped', async () => {
    const receipt = await UploadReceipt.create({ user_id: 3, key_digest: '1'.repeat(64), payload_digest: '2'.repeat(64), status: 'processing' });
    await sequelize.query('UPDATE upload_receipts SET updated_at=DATE_SUB(NOW(), INTERVAL 31 MINUTE) WHERE id=?', { replacements: [receipt.id] });
    const asset = await MediaAsset.create({ id: randomUUID(), receipt_id: receipt.id, public_id: `tunetrek/${randomUUID()}`, resource_type: 'video', delivery_type: 'authenticated', format: 'wav', state: 'planned' });
    remote.add(asset.public_id);
    await uploads.retryCleanup({ recoverStale: true });
    assert.equal((await UploadReceipt.findByPk(receipt.id)).status, 'failed');
    assert.equal((await MediaAsset.findByPk(asset.id)).state, 'cleaned'); assert.equal(remote.has(asset.public_id), false);
  });

  await t.test('avatar replacement keeps old asset on failure, and queues prior owned asset only after commit', async () => {
    const avatarForm = () => { const data = new FormData(); data.set('avatar', new Blob([png()], { type: 'image/png' }), 'avatar.png'); return data; };
    const avatarPost = () => fetch(base + '/users/avatar', { method: 'POST', headers: { ...headers('user'), 'Idempotency-Key': randomUUID() }, body: avatarForm() });
    assert.equal((await avatarPost()).status, 200); const old = (await User.findByPk(1)).avatar;
    failImage = true; assert.equal((await avatarPost()).status, 500); failImage = false;
    assert.equal((await User.findByPk(1)).avatar, old);
    assert.equal((await avatarPost()).status, 200);
    assert.ok((await User.findByPk(1)).avatar !== old);
    assert.ok(await MediaAsset.count({ where: { state: 'cleanup_pending' } }) > 0);
    await uploads.retryCleanup(); await noTemp();
  });
};
