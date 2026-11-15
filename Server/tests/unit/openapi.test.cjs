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
