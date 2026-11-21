# Showcase và đóng góp

## Media đã tuyển chọn

- [Walkthrough](showcase/assets/walkthrough.mp4)
- [Desktop](showcase/assets/desktop.png), [mobile](showcase/assets/mobile.png)
- [Playlist](showcase/assets/playlists.png), [recommendation](showcase/assets/recommendation.png), [moderation](showcase/assets/moderation.png)

Đây là artifacts từ bản demo trước, chưa quay lại cho F1/F2/F3. Chúng không chứng minh working tree hiện tại vượt mọi test/edge case. Video cũ có thể còn lời giới thiệu “đồ án cá nhân”; attribution đúng nằm bên dưới và cần dùng khi trình bày.

Luồng demo: Home/search → playback → login/library/playlist → recommendation và giới hạn dữ liệu → admin moderation → CI/test và điều kiện vận hành. Dữ liệu synthetic, audio tone tự sinh; không quảng bá hosting 24/7, app mobile đã phát hành hoặc recommendation đã kiểm chứng trên người dùng thật. Mở demo theo [Operations](OPERATIONS_AND_TESTING.md); URL tunnel lịch sử không cam kết dịch vụ đang online.

## Attribution hai giai đoạn

1. **Giai đoạn 1 — đồ án cơ sở tại trường, nhóm 2 người:** Lê Đình Bảo và Huỳnh Đình Thạch. Nền tảng là sản phẩm chung, không mô tả toàn bộ lịch sử thành đồ án cá nhân.
2. **Giai đoạn 2 — refactoring và enhancement cho portfolio, do Lê Đình Bảo thực hiện cá nhân:** củng cố cấu trúc, tài liệu, kiểm thử và các luồng ứng dụng trên nền dự án nhóm. Không tự nhận toàn bộ code gốc, không bịa tỷ lệ phần trăm đóng góp.

Hai giai đoạn đóng góp khác với Phase 1–5 của roadmap audit hiện tại. Không suy ownership module từ tên thư mục hoặc số commit. CV/phỏng vấn chỉ nhận phần có thể giải thích, tái hiện và đối chiếu lịch sử; ghi rõ công cụ hỗ trợ phát triển/kiểm thử khi thích hợp.

## Gợi ý bullet CV

Các bullet mô tả phần engineering giai đoạn 2 trên nền đồ án nhóm; chỉ dùng khi người trình bày có thể giải thích code và tái chạy evidence. Test integration cần MySQL thật, không suy đã pass từ unit tests.

### Tiếng Việt

- Xây refresh-token family, rotation transaction và auth epoch để xử lý reuse, retry mất response và cache lẫn tài khoản; kiểm chứng bằng [session lifecycle](../Server/tests/integration/session-lifecycle.cjs) và [refresh UI](../UI/tests/unit/refresh-session.test.mjs).
- Dùng playlist row locks/unique constraints và ingress IP allowlist để ngăn race membership và giả mạo quota qua forwarded headers; kiểm chứng bằng [playlist concurrency](../Server/tests/integration/playlist-concurrency.cjs) và [security API tests](../Server/tests/api/security.test.cjs).
- Xây media proxy với byte-range, backpressure, header-only timeout và disconnect cancellation để tránh cắt audio dài/rò kết nối upstream; [4 stream regression tests](../Server/tests/api/media-stream.test.cjs) bao phủ timeout, streaming, seek và disconnect.
- Hoàn thiện trạng thái bài gửi/lý do moderation và lịch sử nghe cursor theo tài khoản để tránh lộ dữ liệu, trùng bài qua trang và cache cũ sau chuyển phiên; kiểm chứng bằng [submissions UI](../UI/tests/components/song-submissions.test.mjs), [recent API](../Server/tests/api/recent-activity.test.cjs) và [activity delivery](../UI/tests/unit/recent-activity-delivery.test.mjs).
- Publish recommendation snapshot nguyên tử và onboarding favorite batch để tránh snapshot dở dang và feed cold-start không có tín hiệu; [snapshot integration](../Server/tests/integration/recommendation-snapshots.cjs) kiểm tra publication, [fixture F3](../Server/tests/api/recommendation-onboarding.test.cjs) đạt Recall@3/NDCG@3 từ 0/0 lên 1/1 (synthetic, không phải production uplift).

### English

- Built transactional refresh-token families and auth-epoch cache isolation to handle token reuse, lost-response retries and account switching; verified by [session lifecycle](../Server/tests/integration/session-lifecycle.cjs) and [UI refresh tests](../UI/tests/unit/refresh-session.test.mjs).
- Applied playlist row locks/unique constraints and trusted ingress IP allowlisting to prevent membership races and forwarded-header quota spoofing; covered by [concurrency](../Server/tests/integration/playlist-concurrency.cjs) and [API security tests](../Server/tests/api/security.test.cjs).
- Implemented a byte-range media proxy with backpressure, header-only timeout and disconnect cancellation to prevent long-stream truncation and upstream connection leaks; covered by [4 stream regression tests](../Server/tests/api/media-stream.test.cjs).
- Completed moderation-status submissions and account-scoped cursor history to prevent private-data exposure, duplicate history pages and stale cross-account cache; verified by [submissions](../UI/tests/components/song-submissions.test.mjs), [recent API](../Server/tests/api/recent-activity.test.cjs) and [delivery tests](../UI/tests/unit/recent-activity-delivery.test.mjs).
- Built atomic recommendation snapshots and transactional starter favorites to prevent partial publication and seedless feeds; verified by [snapshot integration](../Server/tests/integration/recommendation-snapshots.cjs), with Recall@3/NDCG@3 improving from 0/0 to 1/1 in the [deterministic F3 fixture](../Server/tests/api/recommendation-onboarding.test.cjs), not a production uplift claim.

## Quyền sử dụng và giới hạn

[LICENSE](../LICENSE) áp dụng trong phạm vi quyền của chủ sở hữu source; không tự đổi quyền của code đồng tác giả, dependency, artwork hay dataset bên thứ ba. Dependency/icon packages giữ notices riêng. [Audio generator](../scripts/generate-demo-audio.cjs) tạo tone demo; benchmark synthetic không phải dữ liệu nghe thật.

Media/dataset/model legacy ngoài release tree do quyền phân phối chưa được xác minh. Không đưa lại vào public candidate chỉ vì có bản local. `.local-backups/`, env, SQL backup, evidence thô không thuộc showcase. CI/test lịch sử không chứng minh production readiness hoặc lịch sử Git sạch secret.
