import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlaylistCover from "../../app/components/FeaturedPlaylists/PlaylistCover.tsx";

test("empty playlist renders its fallback cover", () => {
  const html = renderToStaticMarkup(React.createElement(PlaylistCover, { images: [] }));
  assert.match(html, /src="\/images\/default-song.svg"/);
  assert.match(html, /alt="Default Playlist Cover"/);
});

test("playlist cover limits the rendered artwork to four images", () => {
  const images = [1, 2, 3, 4, 5].map((id) => `/cover-${id}.jpg`);
  const html = renderToStaticMarkup(React.createElement(PlaylistCover, { images }));
  assert.equal((html.match(/<img /g) || []).length, 4);
  assert.doesNotMatch(html, /cover-5/);
});
