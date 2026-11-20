const { Op } = require("sequelize");
const { Song } = require("../../src/models");

// ID 5 represents a deleted record and is intentionally absent.
const catalog = [
  { song_id: 1, status: "approved", is_visible: true, view_count: 20 },
  { song_id: 2, status: "pending", is_visible: true, view_count: 999 },
  { song_id: 3, status: "rejected", is_visible: true, view_count: 998 },
  { song_id: 4, status: "approved", is_visible: false, view_count: 997 },
  { song_id: 6, status: "approved", is_visible: true, view_count: 10 },
].map((song) => ({ ...song, title: `Track ${song.song_id}`, audio_url: `https://media.example.test/${song.song_id}.mp3` }));

function matches(row, where = {}) {
  return Reflect.ownKeys(where).every((key) => {
    const value = where[key];
    if (key === Op.or) return value.some((part) => matches(row, part));
    if (key === Op.and) return value.every((part) => matches(row, part));
    if (value && typeof value === "object") {
      if (Op.in in value) return value[Op.in].includes(row[key]);
      if (Op.notIn in value) return !value[Op.notIn].includes(row[key]);
      if (Op.ne in value) return row[key] !== value[Op.ne];
      if (Op.like in value) return String(row[key] || "").includes(value[Op.like].replaceAll("%", ""));
    }
    return row[key] === value;
  });
}

function select(options = {}, source = catalog) {
  let rows = source.filter((song) => matches(song, options.where));
  if (options.order?.[0]?.[0] === "view_count") rows = rows.toSorted((a, b) => b.view_count - a.view_count);
  return rows.slice(options.offset || 0, options.limit === undefined ? undefined : (options.offset || 0) + options.limit);
}

function mockSongReads(t, source = catalog) {
  t.mock.method(Song, "findOne", async (options) => select(options, source)[0] || null);
  t.mock.method(Song, "findAll", async (options) => select(options, source));
  t.mock.method(Song, "findByPk", async (id) => source.find((song) => song.song_id === Number(id)) || null);
  t.mock.method(Song, "findAndCountAll", async (options) => ({
    rows: select(options, source), count: source.filter((song) => matches(song, options.where)).length,
  }));
}

module.exports = { catalog, matches, select, mockSongReads };
