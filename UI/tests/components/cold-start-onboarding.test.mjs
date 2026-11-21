import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

// Render the real component tree with deterministic hook and request boundaries.
function loadComponent(file, dependencies, globals = {}) {
  const url = new URL("../../app/" + file, import.meta.url);
  const { outputText } = ts.transpileModule(fs.readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const state = [];
  let cursor = 0;
  const modules = {
    "react/jsx-runtime": jsxRuntime,
    react: {
      useId: () => "onboarding-title",
      useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [state[index], (next) => {
          state[index] = typeof next === "function" ? next(state[index]) : next;
        }];
      },
    },
    ...dependencies,
  };
  const testModule = { exports: {} };
  const run = vm.runInNewContext(`(function(require, module, exports) { ${outputText}\n })`, globals, { filename: file });
  run((name) => {
    assert.ok(Object.hasOwn(modules, name), `unmocked import: ${name}`);
    return modules[name];
  }, testModule, testModule.exports);
  return (props) => {
    cursor = 0;
    return testModule.exports.default(props);
  };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object" || !node.props) return [];
  return [node, ...nodes(node.props.children)];
}
const textOf = (node) => Array.isArray(node) ? node.map(textOf).join("") :
  node?.props ? textOf(node.props.children) : typeof node === "string" || typeof node === "number" ? String(node) : "";
const button = (tree, label) => nodes(tree).find((node) => node.type === "button" && textOf(node) === label);
const ofType = (tree, type) => nodes(tree).find((node) => node.type === type);
const role = (tree, value) => nodes(tree).find((node) => node.props.role === value);
const noop = () => null;
const scope = (userId, epoch) => ({ userId, epoch, limit: 10 });

test("Home mounts recommendations only for signed-in accounts and remounts them at an account change", () => {
  let auth = { status: "anonymous", principal: null, epoch: 1 };
  const Rec = () => null;
  const render = loadComponent("components/FeaturedPlaylists/FeaturedPlaylists.tsx", {
    "@/app/features/player/context/PlayerContext": { usePlayerControls: () => ({}) },
    "@/app/features/recommendation/components/RecommendationSection": Rec,
    "@/app/features/recommendation/components/SimilarSongsSection": noop,
    "@/app/lib/use-auth-state": { useAuthState: () => auth },
    "@/app/styles/feature-playlists.css": {},
    "../../features/artist/components/ArtistSection": noop,
    "./TrackSection": noop,
  });
  assert.equal(ofType(render({}), Rec), undefined);
  auth = { status: "authenticated", principal: { userId: 1 }, epoch: 2 };
  const first = ofType(render({}), Rec);
  auth = { status: "authenticated", principal: { userId: 2 }, epoch: 3 };
  const next = ofType(render({}), Rec);
  assert.deepEqual({ ...first.props }, scope(1, 2));
  assert.deepEqual({ ...next.props }, scope(2, 3));
  assert.notEqual(first.key, next.key);
});

test("starter panel separates loading and retry states, enforces selection bounds and submits retained IDs", async () => {
  const songs = Array.from({ length: 12 }, (_, i) => ({ trackId: i + 1, title: `Bài ${i + 1}`, artistName: "Nghệ sĩ" }));
  const attempts = [];
  const receipts = [];
  let retriedCatalog = 0;
  let pageData = {};
  const render = loadComponent("features/recommendation/components/ColdStartOnboarding.tsx", {
    swr: () => ({ ...pageData, mutate: () => { retriedCatalog++; } }),
    "@/app/features/like/favorite.api": {
      addFavoriteBatch: async (ids) => {
        attempts.push(Array.from(ids));
        if (attempts.length === 1) throw new Error("temporary failure");
        return { songIds: ids, count: ids.length };
      },
    },
    "@/app/features/song/song.api": { fetchDailySongs: noop },
    "@/app/lib/auth-state": { assertAuth: (_, epoch) => assert.equal(epoch, 2) },
  });
  const tree = () => render({ epoch: 2, onDismiss: noop, onSaved: async (ids) => receipts.push(Array.from(ids)) });
  assert.match(textOf(role(tree(), "status")), /Đang tải/);
  assert.equal(ofType(tree(), "input"), undefined);
  pageData = { error: new Error("catalog offline") };
  assert.match(textOf(role(tree(), "alert")), /Không thể tải/);
  button(tree(), "Thử tải lại").props.onClick();
  assert.equal(retriedCatalog, 1);

  pageData = { data: { songs, total: songs.length } };
  const submit = () => button(tree(), "Lưu và cập nhật gợi ý");
  const inputs = () => nodes(tree()).filter((node) => node.type === "input");
  assert.equal(inputs()[0].props.type, "checkbox");
  for (let i = 0; i < 3; i++) {
    assert.equal(submit().props.disabled, true);
    inputs()[i].props.onChange();
  }
  assert.equal(submit().props.disabled, false);
  assert.match(textOf(role(tree(), "status")), /3\/10/);
  for (let i = 3; i < 10; i++) inputs()[i].props.onChange();
  assert.equal(inputs()[10].props.disabled, true);
  for (let i = 3; i < 10; i++) inputs()[i].props.onChange();

  await submit().props.onClick();
  assert.match(textOf(role(tree(), "alert")), /Không thể lưu/);
  assert.equal(submit(), undefined);
  await button(tree(), "Thử lưu lại").props.onClick();
  assert.deepEqual(attempts, [[1, 2, 3], [1, 2, 3]]);
  assert.deepEqual(receipts, [[1, 2, 3]]);
  assert.match(textOf(role(tree(), "status")), /Đã lưu/);
});

test("only cold-start feeds offer onboarding, with per-account dismissal, isolated keys and immediate revalidation", async () => {
  const Onboarding = () => null;
  const storage = new Map();
  const keys = [];
  const calls = [];
  let epoch = 2;
  let feed = { mode: "cold_start", songs: [] };
  const mount = () => loadComponent("features/recommendation/components/RecommendationSection.tsx", {
    swr: (key) => {
      keys.push(Array.from(key));
      return { data: feed, mutate: async () => { calls.push("recommendations"); } };
    },
    "react-icons/fa": { FaChevronLeft: noop, FaChevronRight: noop },
    "react-icons/pi": { PiSparkle: noop },
    "react-icons/ri": { RiResetRightLine: noop },
    "@/app/features/like/context/LikeContext": { useLikeContext: () => ({
      refreshAfterBatch: async (ids) => { calls.push([...ids]); },
    }) },
    "@/app/features/player/context/PlayerContext": { usePlayerControls: () => ({}) },
    "@/app/lib/auth-state": { getAuth: () => ({ epoch }) },
    "@/app/features/recommendation/recommendation.css": {},
    "../recommendation.api": {},
    "./ColdStartOnboarding": Onboarding,
    "./ExplanationToggle": noop,
    "./RecommendSongCard": noop,
  }, { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } });

  const a = mount();
  const panelA = ofType(a(scope(1, 2)), Onboarding);
  panelA.props.onDismiss();
  assert.equal(ofType(a(scope(1, 2)), Onboarding), undefined);
  assert.equal(ofType(mount()(scope(1, 2)), Onboarding), undefined);

  epoch = 3;
  const b = mount();
  const panelB = ofType(b(scope(2, 3)), Onboarding);
  assert.ok(panelB);
  assert.deepEqual(keys.at(-1), ["recommendations", 2, 3, 10]);
  assert.deepEqual(keys.at(0), ["recommendations", 1, 2, 10]);
  await panelA.props.onSaved([5, 6, 7]);
  assert.deepEqual(calls, []);
  await panelB.props.onSaved([1, 2, 3]);
  assert.deepEqual(calls, ["recommendations", [1, 2, 3]]);

  feed = { mode: "personalized", songs: [{ trackId: 4, title: "Jazz 4", reason: 'Từ bài "Jazz 1" bạn đã yêu thích.' }] };
  assert.equal(ofType(b(scope(2, 3)), Onboarding), undefined);
  assert.match(textOf(role(b(scope(2, 3)), "status")), /Jazz 1.*đã yêu thích/);
  feed = { mode: "trending", songs: [] };
  assert.equal(ofType(mount()(scope(2, 3)), Onboarding), undefined);
  epoch = 4;
  mount()(scope(2, 4));
  assert.deepEqual(keys.at(-1), ["recommendations", 2, 4, 10]);
});
