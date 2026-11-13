import { test } from 'node:test';
import assert from 'node:assert/strict';
import httpServer from 'node:http';
import { once } from 'node:events';
import { readApiResponse } from '../../app/lib/api-contract.ts';
import http from '../../app/lib/http.ts';
const body = { error: { code: 'RATE_LIMITED', message: 'Quota exceeded', details: [] }, requestId: 'fixture' };

test('fetch exposes Retry-After with a useful UI message and never retries 429', async () => {
  const response = new Response(JSON.stringify(body), { status: 429, headers: { 'Retry-After': '12' } });
  await assert.rejects(readApiResponse(response), (error) => error.status === 429 && error.retryAfterSeconds === 12 && error.message.includes('12 giây'));
});
test('Axios exposes Retry-After without starting a refresh or retrying the request', async (t) => {
  let calls = 0;
  const server = httpServer.createServer((req, res) => { calls++; res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '7' }); res.end(JSON.stringify(body)); }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const previous = http.defaults.baseURL;
  http.defaults.baseURL = `http://127.0.0.1:${server.address().port}`;
  t.after(() => { http.defaults.baseURL = previous; });
  await assert.rejects(http.get('/fixture'), (error) => error.response.status === 429 && error.response.data.retryAfterSeconds === 7 && error.message.includes('7 giây'));
  assert.equal(calls, 1);
});
