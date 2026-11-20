import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Evaluate real API modules with explicit transport mocks, without browser/network.
function loadApi(relativePath, dependencies) {
  const file = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const testModule = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${outputText}\n })`, {}, { filename: file.pathname })(
    (name) => {
      if (!(name in dependencies)) throw new Error(`Unmocked import: ${name}`);
      return dependencies[name];
    }, testModule, testModule.exports,
  );
  return testModule.exports;
}

test("recommendation client uses /me and retains response mapping", async () => {
  const calls = [];
  const api = loadApi("../../app/features/recommendation/recommendation.api.ts", {
    "@/app/lib/http": { get: async (url) => { calls.push(url); return { data: { data: [{ song_id: 3 }] } }; } },
    "./recommendation.mapper": { mapRawToRecommendationSong: (song) => ({ trackId: song.song_id }) },
  });
  const songs = await api.getRecommendationsForUser(5);
  assert.deepEqual(calls, ["/recommendations/me?limit=5"]);
  assert.equal(songs[0].trackId, 3);
});

test("admin self change sends current password to its own endpoint; reset keeps target endpoint", async () => {
  const calls = [];
  const api = loadApi("../../app/features/user/accountApi.ts", {
    "../../utils/refreshToken": { adminFetch: async (url, options) => { calls.push({ url, options }); return {}; } },
    "../auth/authApi": { URL: "https://api.example.test/api" },
  });
  await api.changeOwnAdminPassword("current", "NewPassword123!");
  assert.equal(calls[0].url, "https://api.example.test/api/users/admin/change-password");
  assert.deepEqual(JSON.parse(calls[0].options.body), { oldPassword: "current", newPassword: "NewPassword123!" });
  await api.changeAdminPassword(2, "NewPassword123!");
  assert.equal(calls[1].url, "https://api.example.test/api/users/2/reset-password");
});
