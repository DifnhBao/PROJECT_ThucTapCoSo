const test = require("node:test");
const assert = require("node:assert/strict");
const { Song } = require("../../src/models");
const { getTrendingSongs } = require("../../src/services/recommendation/recommendation.service");

test("pending-only catalog stays empty; trending never relaxes publication policy", async (t) => {
  const find = t.mock.method(Song, "findAll", async ({ where }) => where.status === "approved"
    ? [] : [{ song_id: 2, status: "pending", is_visible: true, audio_url: "pending-url" }]);
  assert.deepEqual(await getTrendingSongs(10), []);
  assert.equal(find.mock.callCount(), 1);
});
