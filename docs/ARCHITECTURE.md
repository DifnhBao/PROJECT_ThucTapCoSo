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

Listening dùng event UUID/receipt và transaction để retry không cộng view lặp. Upload cleanup có journal/CLI, chưa có scheduler. Lệnh vận hành ở [Operations](OPERATIONS_AND_TESTING.md); ranking/snapshot ở [Recommendation](RECOMMENDATION_AND_EVALUATION.md).
