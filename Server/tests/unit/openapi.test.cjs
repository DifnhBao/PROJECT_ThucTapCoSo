const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildOpenApi, mounts } = require('../../scripts/generate-openapi.cjs');
test('published OpenAPI matches every mounted route and has no unresolved schema reference', () => {
  const generated = buildOpenApi();
  const published = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/api/openapi.json'), 'utf8'));
  assert.deepEqual(generated, published);
  for (const [mount, [file]] of Object.entries(mounts)) {
    const router = require(path.resolve(__dirname, '../../src/routes', file));
    for (const layer of router.stack.filter((item) => item.route)) {
      const route = layer.route;
      const url = ('/' + mount + (route.path === '/' ? '' : route.path)).replace(/:(\w+)/g, '{$1}');
      for (const method of Object.keys(route.methods)) assert.ok(generated.paths[url]?.[method], `${method} ${url}`);
    }
  }
  function check(node) {
    if (!node || typeof node !== 'object') return;
    if (node.$ref) assert.ok(generated.components.schemas[node.$ref.split('/').at(-1)], node.$ref);
    for (const value of Object.values(node)) check(value);
  }
  check(generated);
  assert.equal(generated.paths['/songs'].get.parameters.find((p) => p.name === 'limit').schema.maximum, 100);
});

test('submissions use user authentication and rejection accepts an optional bounded reason', () => {
  const { paths, components } = buildOpenApi();
  const submissions = paths['/songs/me/submissions'].get;
  assert.deepEqual(submissions.security, [{ userCookie: [] }, { bearerAuth: [] }]);
  assert.equal(submissions.responses[200].content['application/json'].schema.properties.data.$ref, '#/components/schemas/SongSubmissions');
  assert.deepEqual(components.schemas.SongSubmission.properties.status.enum, ['pending', 'approved', 'rejected']);
  const body = paths['/songs/{id}/reject'].patch.requestBody;
  assert.equal(body.required, false);
  const schema = body.content['application/json'].schema;
  assert.equal(schema.properties.rejection_reason.maxLength, 500);
  assert.ok(!schema.required?.includes('rejection_reason'));
  assert.equal(schema.additionalProperties, false);
});

test('favorite batch documents bounded unique IDs and feed documents cold-start mode', () => {
  const { paths, components } = buildOpenApi();
  const batch = paths['/favorites/batch'].post;
  assert.deepEqual(batch.security, [{ userCookie: [] }, { bearerAuth: [] }]);
  const { minItems, maxItems, uniqueItems, items } = batch.requestBody.content['application/json'].schema.properties.songIds;
  assert.deepEqual([minItems, maxItems, uniqueItems, items.type, items.minimum], [3, 10, true, 'integer', 1]);
  assert.match(batch.responses[400].description, /STARTER_SONG_UNAVAILABLE/);
  const feed = paths['/recommendations/me'].get.responses[200].content['application/json'].schema;
  assert.equal(feed.properties.data.$ref, '#/components/schemas/RecommendationFeed');
  assert.deepEqual(components.schemas.RecommendationFeed.properties.mode.enum, ['cold_start', 'trending', 'personalized']);
});
