import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, readApiResponse, unwrapApiEnvelope, apiFailure } from '../../app/lib/api-contract.ts';
test('fetch transport reads the new envelope without changing business DTOs', async () => {
  const dto = { data: [{ song_id: 1 }], pagination: { page: 1, total: 1 } };
  const response = Response.json({ data: dto, meta: { requestId: 'request-1' } });
  assert.deepEqual(await readApiResponse(response), dto);
  assert.deepEqual(unwrapApiEnvelope({ data: { user: { user_id: 1 } }, meta: { requestId: 'request-2' } }), { user: { user_id: 1 } });
});
test('fetch exposes stable status/code/requestId and safe message from failed responses', async () => {
  const response = Response.json({ error: { code: 'PLAYLIST_SONG_EXISTS', message: 'Already exists', details: [] }, requestId: 'request-3' }, { status: 409 });
  await assert.rejects(readApiResponse(response), (error) => error instanceof ApiError && error.status === 409 && error.code === 'PLAYLIST_SONG_EXISTS' && error.requestId === 'request-3');
  const invalid = apiFailure({ message: 'SELECT private SQL' }, 500);
  assert.equal(invalid.message.includes('SELECT'), false);
  assert.deepEqual(apiFailure({ error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: [{ path: 'body.name', code: 'too_small' }] }, requestId: 'request-4' }, 400).details, [{ path: 'body.name', code: 'too_small' }]);
});
test('malformed envelopes fail explicitly and no-content responses do not parse JSON', async () => {
  assert.throws(() => unwrapApiEnvelope({ data: [] }), { code: 'INVALID_API_RESPONSE' });
  await assert.rejects(readApiResponse(new Response('<html>', { status: 502 })), { code: 'INVALID_API_RESPONSE' });
  assert.equal(await readApiResponse(new Response(null, { status: 204 })), undefined);
});
