# Kiến trúc và các bất biến

Trong Compose, browser → ingress Nginx → Next.js/React cho trang web hoặc Express cho `/api` và `/health` cùng origin. Express dùng MySQL 8. Cloudinary lưu media mới ở chế độ authenticated; Python không nằm trên đường phục vụ. Khi chạy Next trực tiếp, [Next rewrites](../UI/next.config.ts) dùng `API_INTERNAL_URL` phía server lúc build. [app.js](../Server/src/app.js) lắp middleware/routes; [server.js](../Server/src/server.js) quản lý startup/shutdown.

MySQL giữ nghiệp vụ, session, receipts và snapshots. Schema do [migrations](../Server/migrations/) quản lý, không tự sync/alter lúc startup. [OpenAPI](api/openapi.json) là hợp đồng endpoint; tái sinh bằng `npm --prefix Server run docs:api` khi API thay đổi.

## Auth và session

- Password dùng bcrypt. Login tạo family UUID và refresh token ngẫu nhiên 32 byte; DB chỉ lưu SHA-256 digest của refresh token. Access JWT tối đa 30 phút; family hết hạn tuyệt đối sau 7 ngày, rotation không kéo dài hạn.
- Transaction khóa user trước token rows. Rotation consume token cũ và insert successor cùng commit. Successor HMAC cho phép trả lại đúng kết quả khi response thất lạc mà không lưu raw token.
- Retry trong 10 giây chỉ nhận successor còn active; family đã tiến thêm bước trả `409 REFRESH_CONFLICT`. Reuse sau grace thu hồi family rồi trả 401. Người giữ token cũ cũng có thể replay trong grace; không có sender binding.
- Logout thu hồi family; đổi/reset password hoặc role thu hồi mọi family của target. Middleware đối chiếu session và role hiện tại với DB; DB lỗi không fallback JWT-only. Request đã qua middleware có thể hoàn tất.
- User/admin có scope và cookie riêng. Cookie HttpOnly, SameSite=Lax, Secure ở production; mutation áp dụng origin policy. Client refresh single-flight theo scope, dùng Web Locks khi hỗ trợ và chỉ retry request gốc một lần. Cache/response gắn auth epoch để tránh dữ liệu tài khoản cũ xuất hiện sau chuyển phiên.

Nguồn: [session service](../Server/src/services/session.service.js), [auth middleware](../Server/src/midlewares/auth.midleware.js). Session migration loại credentials legacy, yêu cầu đăng nhập lại.

## IP và quota

[Ingress Compose](../deploy/compose-ingress.conf) ghi đè `X-Forwarded-For` bằng `$remote_addr` rồi chuyển `/api` và `/health` tới Express. Compose chỉ publish cổng ingress và đặt `TRUSTED_PROXY_CIDRS` của API đúng bằng địa chỉ IPv4 `/32` của ingress. Các request từ Next.js hoặc peer ngoài allowlist dùng IP socket. Các địa chỉ client khác nhau mà ingress nhìn thấy có bucket riêng theo IPv4 hoặc prefix IPv6 `/64`. Quota theo tài khoản và theo user vẫn dùng định danh tương ứng.

Khi chạy API ngoài Compose, bỏ trống `TRUSTED_PROXY_CIDRS` để dùng IP socket. Với proxy được tin cậy, Express đọc chuỗi từ phải sang trái và dừng ở hop đầu tiên ngoài allowlist. Next rewrite có thể chuyển tiếp `X-Forwarded-For` do client gửi, vì vậy chỉ cấu hình tin cậy proxy có kiểm soát header. Xem [hướng dẫn vận hành](OPERATIONS_AND_TESTING.md) khi có NAT hoặc một lớp ingress khác.

## Playlist concurrency

Chỉ owner được sửa/xóa playlist; identity lấy từ session. Private playlist chỉ owner hoặc admin được đọc; người không có quyền nhận 404. Add/remove/delete khóa row playlist bằng `FOR UPDATE` trong transaction, rồi mới khóa song/membership. Row lock phối hợp được nhiều API process.

Add kiểm tra approved + visible bằng locking read, cấp `max(position)+1`; unique `(playlist_id,song_id)` và `(playlist_id,position)` bảo vệ cuối. Trùng bài trả 409, gỡ giữ khoảng trống position; owner có thể gỡ membership của bài đã ẩn. Xóa parent/joins cùng transaction. Chỉ deadlock/lock timeout retry tối đa 3 lượt; hết lượt trả `PLAYLIST_BUSY`. Không gọi provider trong transaction. Xem [playlist service](../Server/src/services/playlist.service.js).

## Publication, upload và media proxy

Public eligibility luôn là `approved AND is_visible=true`, lọc trước limit trên catalog/search/playlist/favorite/recommendation. Không nới policy khi rỗng. Admin preview có endpoint/quyền riêng; query/body không bật được preview công khai.

Upload cần `Idempotency-Key`, auth/quota và kiểm tra MIME/chữ ký file. Receipt gắn user, operation và digest payload. Replay cùng key/payload trả snapshot đã commit; khác payload hoặc đang xử lý trả 409. Nếu chưa biết commit thành công hay không, giữ descriptor/assets và retry cùng key; không compensation nhầm asset đã thuộc resource.

Media mới có descriptor trước network call, dùng Cloudinary authenticated. DTO trả `/api/media/<UUID>`; gateway kiểm tra ownership/publication, tạo signed URL phía server rồi stream, không redirect chữ ký ra browser. Range được chuyển tiếp, cache private/no-store. Pending/rejected/hidden cần admin session; uploader thường không có quyền preview media riêng. Avatar chỉ phục vụ asset hiện tại.

Request mới kiểm tra quyền; bytes đã tải/request đã qua gate không thể thu hồi. URL public legacy chưa có descriptor không tự được chuyển đổi/revoke. Proxy tăng bandwidth/latency; tests mock không chứng minh provider thật.

Proxy chờ upstream headers tối đa 30 giây rồi hủy timer; không dùng deadline đó cho toàn bộ audio. `pipeline` truyền backpressure; client disconnect hủy upstream. Lỗi trước header đi qua error middleware, lỗi sau header đóng stream. Chỉ chấp nhận một range dạng `bytes=start-end` hoặc `bytes=start-`; bảo toàn 206 và các header `Content-Length`, `Content-Range`, `Accept-Ranges`. Suffix/multi-range bị từ chối 416. [Media stream tests](../Server/tests/api/media-stream.test.cjs) kiểm tra header timeout, audio dài hơn deadline, seek và disconnect.

## Search và các hành trình F1/F2/F3

- **Search multi-artist:** [song service](../Server/src/services/song.service.js) dùng correlated `EXISTS` qua `song_artists`/`artists`, bind `artistPattern`, lọc publication trước phân trang song. `distinct` đếm song, sort `view_count DESC, song_id ASC`; hydrate đầy đủ artists sau khi chọn trang. Không dùng join nhân bản rows rồi limit. `%keyword%` chưa phải full-text index; phải EXPLAIN trên dữ liệu thật.
- **F1:** `GET /api/songs/me/submissions` lấy owner từ session, trả metadata/trạng thái và `rejection_reason`/`reviewed_at`, không cấp quyền phát media pending/rejected. [Migration moderation](../Server/migrations/20261120000100-song-moderation-metadata.js) thêm hai cột nullable; không suy lý do cho dữ liệu cũ. Cache key gồm user ID/auth epoch; upload thành công revalidate đúng key. [Tests UI](../UI/tests/components/song-submissions.test.mjs).
- **F2:** `GET /api/activity/me/recent` nhóm theo song của user, lấy `MAX(created_at)` trước cursor; lọc approved/visible trước limit. Sort `(last_played DESC, song_id DESC)`, lấy `limit+1` để trả `hasMore`/`nextCursor`; không dùng offset. Index `idx_user_song_created(user_id,song_id,created_at)` hỗ trợ grouping. Đây là lịch sử receipts, không chỉ qualified listens. Cache gồm user/epoch/cursor, gộp trang deduplicate song; receipt thành công cùng epoch mới kích hoạt revalidation debounce 300 ms. Không có snapshot xuyên trang khi phát thêm bài; refresh cập nhật thứ tự. [API tests](../Server/tests/api/recent-activity.test.cjs), [delivery tests](../UI/tests/unit/recent-activity-delivery.test.mjs).
- **F3:** feed trả `cold_start`, `trending` hoặc `personalized`. UI cold-start cho chọn 3–10 bài public, `POST /api/favorites/batch` kiểm tra toàn bộ và ghi transaction; replay không nhân đôi favorite, bài không còn public khiến cả batch thất bại. Dismiss lưu theo user; mutation/revalidation kiểm tra auth epoch. Favorite và recommendation cache được cập nhật sau save, không rebuild snapshot qua HTTP. Chi tiết và fixture ở [Recommendation](RECOMMENDATION_AND_EVALUATION.md).

Listening dùng event UUID/receipt và transaction để retry không cộng view lặp. Upload cleanup có journal/CLI, chưa có scheduler. Lệnh vận hành ở [Operations](OPERATIONS_AND_TESTING.md); ranking/snapshot ở [Recommendation](RECOMMENDATION_AND_EVALUATION.md).
