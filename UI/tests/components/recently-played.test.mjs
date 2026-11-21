import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RecentlyPlayed from '../../app/features/song/components/RecentlyPlayed.tsx';
import { recentKey, recentItems } from '../../app/features/song/recent.api.ts';
const song = { song_id: 1, title: 'Bài vừa nghe', audio_url: '/song.mp3', artists: [{ name: 'Ca sĩ' }], lastPlayedAt: '2026-11-20T00:00:00Z' };
const defaults = { hasError: false, hasMore: false, loadingMore: false, pageError: false, onRetry() {}, onLoadMore() {}, onPlay() {} };
const render = (props) => renderToStaticMarkup(React.createElement(RecentlyPlayed, { ...defaults, ...props }));
test('recently played has mutually exclusive loading/error/empty/data states', () => {
  const markers = ['Đang tải lịch sử nghe', 'Không tải được lịch sử nghe', 'Bạn chưa nghe bài hát nào', 'Bài vừa nghe'];
  [{}, { hasError: true, items: [song] }, { items: [] }, { items: [song] }].forEach((props, index) => {
    const html = render(props); assert.deepEqual(markers.filter((marker) => html.includes(marker)), [markers[index]]);
  });
  assert.match(render({ hasError: true }), /Thử lại/);
});
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)];
}
test('recently played renders artists/time and wires play, pagination and retry actions', () => {
  const calls = [];
  const props = { ...defaults, items: [song], hasMore: true, onPlay: (i) => calls.push(['play', i]), onLoadMore: () => calls.push(['more']) };
  const buttons = nodes(RecentlyPlayed(props)).filter((node) => node.type === 'button');
  buttons.forEach((button) => button.props.onClick());
  assert.deepEqual(calls, [['play', 0], ['more']]);
  assert.match(render(props), /Ca sĩ/); assert.match(render(props), /datetime=/i);
  assert.match(render({ ...props, loadingMore: true }), /disabled=""/);
  assert.match(render({ ...props, pageError: true }), /Thử tải thêm/);
  assert.doesNotMatch(render({ items: [song] }), /Tải thêm/);
  const retry = nodes(RecentlyPlayed({ ...defaults, hasError: true, onRetry: () => calls.push(['retry']) })).find((node) => node.type === 'button');
  retry.props.onClick(); assert.deepEqual(calls.at(-1), ['retry']);
});
test('recent keys isolate account, epoch and cursor; pages merge without duplicate tracks', () => {
  assert.notDeepEqual(recentKey(1, 1), recentKey(2, 1));
  assert.notDeepEqual(recentKey(1, 1), recentKey(1, 2));
  assert.notDeepEqual(recentKey(1, 1), recentKey(1, 1, 'cursor'));
  assert.deepEqual(recentItems([{ items: [song] }, { items: [song, { ...song, song_id: 2 }] }]).map((item) => item.song_id), [1, 2]);
});
