import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SongSubmissions from '../../app/features/song/components/SongSubmissions.tsx';
import ModerationConfirmation from '../../app/(Pages)/administrator/PendingSongs/ModerationConfirmation.tsx';
import { submissionsKey } from '../../app/features/song/song.api.ts';

const song = {
  song_id: 1, title: 'Bài mẫu', status: 'pending', rejection_reason: null,
  artists: [{ name: 'Nghệ sĩ' }], genres: [], duration: 180, created_at: '2026-11-20T00:00:00Z',
};
const renderSubmissions = (props) => renderToStaticMarkup(React.createElement(SongSubmissions, {
  hasError: false, onRetry() {}, onUpload() {}, ...props,
}));

test('submissions display all status badges and only rejected tracks show a reason', () => {
  const html = renderSubmissions({
    submissions: [
      song,
      { ...song, song_id: 2, status: 'approved', rejection_reason: 'Lý do cũ' },
      { ...song, song_id: 3, status: 'rejected', rejection_reason: 'Thiếu thông tin bản quyền' },
    ],
  });
  for (const [status, label] of [['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Bị từ chối']]) {
    assert.ok(html.includes(`data-status="${status}">${label}`));
  }
  assert.match(html, /Thiếu thông tin bản quyền/);
  assert.doesNotMatch(html, /Lý do cũ/);
});

test('submissions render exactly one of loading, error, empty and data', () => {
  const markers = ['Đang tải bài đã gửi', 'Không tải được danh sách bài đã gửi', 'Bạn chưa gửi bài hát nào', 'Bài mẫu'];
  const cases = [{}, { hasError: true, submissions: [song] }, { submissions: [] }, { submissions: [song] }];
  for (const [index, props] of cases.entries()) {
    const html = renderSubmissions(props);
    assert.deepEqual(markers.filter((marker) => html.includes(marker)), [markers[index]]);
  }
  assert.match(renderSubmissions(cases[1]), /<button type="button">Thử lại/);
  assert.match(renderSubmissions(cases[2]), /<button type="button">Gửi bài hát/);
});

test('moderation confirmation exposes the optional field and submits a trimmed reason', () => {
  const confirmed = [];
  const props = {
    action: 'reject', busy: false, reason: '  Thiếu bản quyền  ',
    onConfirm: (reason) => confirmed.push(reason), onReasonChange() {}, onCancel() {},
  };
  const html = renderToStaticMarkup(React.createElement(ModerationConfirmation, props));
  assert.match(html, /<label for="song-rejection-reason">Lý do từ chối \(không bắt buộc\)/);
  assert.match(html, /<textarea[^>]*maxLength="500"[^>]*aria-describedby="song-rejection-limit"/i);
  const submit = (overrides) => ModerationConfirmation({ ...props, ...overrides }).props.onSubmit({ preventDefault() {} });
  submit({});
  submit({ reason: '   ' });
  submit({ action: 'approve' });
  submit({ reason: 'x'.repeat(501) });
  submit({ busy: true });
  assert.deepEqual(confirmed, ['Thiếu bản quyền', undefined, undefined]);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(ModerationConfirmation, { ...props, action: 'approve' })), /textarea/);
});

test('submissions keys differ across users and session epochs', () => {
  assert.notDeepEqual(submissionsKey(1, 1), submissionsKey(2, 1));
  assert.notDeepEqual(submissionsKey(1, 1), submissionsKey(1, 2));
  assert.deepEqual(submissionsKey(1, 1), submissionsKey(1, 1));
});
