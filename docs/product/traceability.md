# Traceability: requirement → thiết kế → test → demo

US là requirement/story, BR là rule; các tiêu chí S/V/P/F xem [acceptance criteria](acceptance-criteria.md). `TCxx` dưới đây là **bí danh trong tài liệu cho tests đã tồn tại**, không claim source test có chứa các ID này. Tên test và file là điểm đối chiếu; không dùng log lịch sử T01/T02 để kết luận trạng thái hiện tại khi T19/T21 đã kiểm chứng tiếp.

## Map yêu cầu

| Story / rules | API / use case (prefix /api) | Bảng / field chính | Tests | Màn demo / evidence |
|---|---|---|---|---|
| US01 / BR01,10 | `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`; nhánh `/auth/admin/*` | users.role/password; refresh_tokens session/family/revoke state | TC01, TC08, TC12 | Login/register, đổi A→B; T06/T12/T19/T21 |
| US02 / BR02,07,08 | GET `/songs`, `/songs/search`, `/songs/:id`, `/media/:assetId`; UC02 player | songs.status/is_visible/audio_url; media_assets owner/delivery; không ghi DB mỗi tick player | TC02, TC06, TC11, TC12 | Home/search/song detail/player; T10/T16/T17/T18/T21 |
| US03 / BR02,05 | POST `/favorites/:id/like`, GET `/favorites/me`, POST `/ratings/rate` | favorites(user_id,song_id); ratings(user_id,song_id,score) | TC02, TC12 | Detail/Likes; T02/T19/T21 |
| US04 / BR02,04 | `/playlists`, `/playlists/me`, `/playlists/:id`, `/playlists/:id/songs` | playlists.user_id/is_public; playlist_songs.song_id/position | TC01, TC02, TC05, TC12 | Playlist list/detail/create dialog; T09/T16/T19/T21 |
| US05 / BR03,06,07 | POST `/songs/upload` (user), `/songs` (admin) | songs.uploaded_by/status/is_visible; upload_receipts.user_id/key_digest/status; media_assets | TC03, TC12 | Upload form; T08/T19/T21 |
| US06 / BR02,03,07 | GET `/songs/pending`, `/songs/admin/:id`; PATCH `/songs/:id/approve`, `/reject`, `/toggle-invisibility`; PUT/DELETE `/songs/:id` | songs.status/is_visible; media_assets.song_id/state | TC02, TC03, TC12 | Admin pending/catalog → public detail; T08/T19/T21 |
| US07 / BR02,11 | GET `/recommendations/me`, `/recommendations/songs/:songId/similar`; POST `/recommendations/rebuild-similarity`; GET `/recommendations/debug/song-pair` | recommendation_state.active_run_id; recommendation_runs.run_id; recommendation_neighbors.seed_id/song_id; UserActivities.qualified; favorites; ratings.score | TC01, TC07, TC10, TC12 | Home explanation; API rebuild/evaluator demo; T14/T15/T21 |
| US08 / BR01,06,10,12 | GET/PUT `/users/me`, POST `/users/avatar`, `/users/change-password`; admin self-password riêng | users profile/password/avatar_url; upload_receipts; media_assets.avatar_user_id; refresh_tokens | TC01, TC03, TC08 | Profile; T08/T12/T16/T19/T21 |
| US09 / BR01,12 | `/users/profile/:id`, `/users/:id/reset-password`, DELETE `/users/:id`, POST `/users/admin/new` | users.user_id/role/password; session revoke state | TC01, TC09 | Admin users/admins; policy tests; T01/T06/T19/T21 |
| US10 / BR08,09,10 | POST `/activity`; retired POST `/songs/:id/view` không mutation | UserActivities.event_id/user_id/payload_digest/qualified/created_at; songs.view_count | TC04, TC06, TC08 | Player + receipt demo; T11/T12/T19/T21 |

Các đường dẫn viết rút gọn cùng nhóm PATCH songs vẫn là `/api/songs/:id/...`. Bảng recommendation ở hàng US07 là schema serving T14, không phải bảng legacy song_similarities hoặc schema Python nghiên cứu.

## Danh mục kiểm chứng

| Alias | File / ca đối chiếu | Tầng và evidence |
|---|---|---|
| TC01 | [authorization HTTP](../../Server/tests/api/authorization.test.cjs): signed actor, injected identity, self password, create admin, owner mutations | HTTP + ORM boundary mocks; T01/T05, sau đó TC02/TC12 và T21 |
| TC02 | [schema/policies integration](../../Server/tests/integration/schema-and-policies.test.cjs): `T01/T02: real HTTP + MySQL enforce authorization, publication, playlist privacy and top-K`; [publication HTTP](../../Server/tests/api/publication.test.cjs) | MySQL thật và HTTP mocks bổ sung; T19/T21 |
| TC03 | [upload lifecycle](../../Server/tests/integration/upload-lifecycle.cjs): `success and replay are atomic...`, `pending media stays private...`, unknown commit và avatar replacement | MySQL thật, provider mock; T08/T19/T21 |
| TC04 | [listening integration](../../Server/tests/integration/listening-events.cjs): `8 simultaneous copies commit one activity and one aggregate increment`, lost response, DB failure, restart | HTTP/MySQL/process thật; T11/T19/T21 |
| TC05 | [playlist concurrency](../../Server/tests/integration/playlist-concurrency.cjs): concurrent adds, duplicate 409, authorization, insert/delete rollback | MySQL thật; T09/T19/T21 |
| TC06 | [listening client](../../UI/tests/unit/listening-session.test.mjs), [player queue](../../UI/tests/unit/player.test.mjs), [audio controller](../../UI/tests/unit/audio-controller.test.mjs) | Unit thật với fake clock/audio boundary; T10/T11/T21 |
| TC07 | [recommendation snapshots](../../Server/tests/integration/recommendation-snapshots.cjs): eligibility before top-K, concurrent rebuild, preserve old snapshot on failure | MySQL thật; [repository](../../Server/src/services/recommendation/snapshot.repository.js), T14/T21 |
| TC08 | [session lifecycle](../../Server/tests/integration/session-lifecycle.cjs), [wire transport](../../UI/tests/unit/transport-wire.test.mjs), [account browser](../../UI/tests/browser/account-smoke.mjs) | DB/session + client + browser layers; T06/T12/T19/T21 |
| TC09 | [user policy](../../Server/tests/unit/user-policy.test.cjs): `reset/delete permission matrix defaults to deny and forbids self actions`; [user service](../../Server/tests/unit/user-service-authorization.test.cjs) | Unit/service boundary + TC01 HTTP; T01/T21 |
| TC10 | [evaluator](../../Server/tests/unit/recommendation-evaluation.test.cjs): hand-calculated metrics, temporal leakage, serving parity, reproducibility; [results](../evaluation/results/synthetic-v1/metrics.json) | Offline synthetic, không HTTP/DB; T15/T21 |
| TC11 | [page flows](../../UI/tests/browser/page-flows.mjs), [accessibility](../../UI/tests/browser/accessibility.mjs), [performance](../../UI/tests/browser/performance.mjs) | Browser API fixtures, responsive/Profiler; T16/T17/T18, T21 regression |
| TC12 | [full-stack E2E](../../UI/tests/e2e/full-stack.test.mjs): register/login, favorite, playlist, pending upload, admin approve, account B isolation | Next/Express/MySQL thật, storage mock; [T19](../verification/T19.md), [T21](../verification/T21.md) |

Các alias theo file không có nghĩa mỗi S/V/P/F đã được chạy end-to-end riêng; dùng tầng unit/HTTP/DB/browser phù hợp cùng với đối chiếu route/schema. Admin self-profile PUT không có route là kiểm tra code, không được gán nhãn test tự động đã assert absence. Favorite conversion/TTL/audit journal chưa có triển khai nên không map giả sang tests.

## Walkthrough có thể trình bày

1. **BR02/US05/US06:** TC03 kiểm tra media pending/private và Range; TC12 upload qua form, admin approve rồi guest đọc. Đối chiếu status/is_visible, asset ownership và public gateway trong một use case, không chỉ screenshot.
2. **BR09/US10:** TC04 gửi 8 bản sao cùng UUID rồi kiểm tra một row/aggregate increment, thử payload conflict và mất response; TC06 kiểm tra seek/pause không cộng thời gian. Không diễn giải dedupe thành exactly-once delivery.

Bằng chứng CI hiện có: [final required check T21](../verification/evidence/T21/final-required-check.json), [stage metadata](../verification/evidence/T21/remote-green-stages.json). T22 không chạy lại suite/migrations; xem [báo cáo T22](../verification/T22.md) cho kiểm tra tài liệu và các sai khác đã ghi nhận.
