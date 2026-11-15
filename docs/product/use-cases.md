# Actors, user stories và luồng chính

Các endpoint ở đây dùng prefix `/api`. Quyền cụ thể ở [ma trận](permission-matrix.md); tiêu chí của từng story ở [acceptance criteria](acceptance-criteria.md).

| Actor | Mục tiêu | Ranh giới |
|---|---|---|
| Guest | Khám phá/tìm/phát bài công khai, xem playlist public | Không ghi library hoặc activity cá nhân |
| User | Giữ tài khoản, nghe nhạc, favorite, playlist, upload, nhận gợi ý riêng | Chỉ ghi dữ liệu của principal user |
| Admin | Quản lý catalog, duyệt upload, quản lý user thường | Phiên admin riêng; không mặc nhiên có quyền user scope |
| Super admin | Quyền admin và tạo/quản lý tài khoản admin trong giới hạn policy | Không reset/xóa chính mình hoặc bất kỳ super_admin nào |

## Danh mục story

| ID / use case | User story | Màn demo |
|---|---|---|
| US01 / UC01 | Là người nghe, tôi muốn đăng ký/đăng nhập và kết thúc phiên an toàn để giữ library riêng | Login/register, đổi tài khoản |
| US02 / UC02 | Là người nghe, tôi muốn tìm/mở bài công khai và điều khiển queue để nghe liên tục | Home/search, `/songs/[id]`, player |
| US03 / UC03 | Là user, tôi muốn thích/bỏ thích bài để tìm lại trong library | Song detail, Likes |
| US04 / UC04 | Là user, tôi muốn tạo playlist, thêm/xóa bài và xóa playlist của mình | `/Playlist`, `/playlists/[id]` |
| US05 / UC05 | Là user có hồ sơ hợp lệ, tôi muốn upload một lần và retry an toàn khi mất mạng | Form upload |
| US06 / UC06 | Là admin, tôi muốn preview/duyệt/từ chối/ẩn bài để kiểm soát catalog public | Admin songs/pending |
| US07 / UC07 | Là user, tôi muốn xem gợi ý có lý do; là admin, tôi muốn rebuild snapshot mà không phục vụ dữ liệu dở dang | Home recommendation, admin rebuild API |
| US08 / UC08 | Là user, tôi muốn sửa hồ sơ/avatar và đổi mật khẩu bằng mật khẩu hiện tại | Profile |
| US09 / UC09 | Là quản trị viên, tôi muốn quản lý tài khoản đúng cấp quyền | Admin users/admins |
| US10 / UC10 | Là người nghe, tôi muốn phiên nghe được ghi nhất quán dù gửi lại sự kiện | Player và receipt API minh họa kỹ thuật |

## UC02 — Khám phá và nghe

1. Guest/user mở Home hoặc tìm kiếm; chỉ bài approved + visible được trả về. Mở link trực tiếp tải theo ID, không phụ thuộc currentTrack cũ.
2. Chọn bài → player nhận queue/source → người dùng chủ động phát. Native playing bắt đầu đo nghe; pause/buffering không cộng thời gian.
3. Next/previous/shuffle/repeat tuân theo queue; seek không tự tạo thời gian đã nghe. Khi có thêm page, bài trùng không làm đổi bài đang phát.
4. User có thể favorite hoặc thêm bài vào playlist. Guest phải đăng nhập trước thao tác ghi.
5. Kết thúc/đổi bài/dừng/đóng trang finalize session đã thực sự playing. User gửi activity; guest không có endpoint ghi activity được xác thực.

Nhánh thay thế: catalog rỗng hiển thị empty; lỗi mạng có retry; bài thiếu/không public trả 404; media lỗi không được xem như đã nghe thành công. Bài bị ẩn biến mất khỏi lần đọc tiếp theo, không cam kết thu hồi audio đã buffer. Đổi account bỏ cache/session nghe của account trước.

## UC05/UC06 — Upload và publication

| Từ | Hành động / actor | Sang / kết quả |
|---|---|---|
| Chưa có resource | User có first/last name upload hợp lệ với Idempotency-Key | Song pending, invisible; receipt hoàn tất cùng song/relations |
| Chưa có resource | Admin upload hợp lệ | Song approved/visible theo đường tạo admin; không giả định mọi upload phải pending |
| Pending | Admin/super_admin approve | Approved + visible |
| Pending | Admin/super_admin reject | Rejected + invisible |
| Approved | Admin/super_admin toggle visibility | Đổi is_visible; invisible thì không public |
| Bất kỳ bài còn tồn tại | Admin/super_admin sửa metadata/status hoặc xóa | Có đường update tổng quát; không chỉ các nút duyệt pending |

Approve/reject resource không pending trả 409; không tồn tại trả 404. Quy trình UI hướng tới pending → quyết định; code hiện không bảo đảm state machine độc quyền vì admin update cũng nhận status. Không có promise resubmit/rejection reason/audit journal nghiệp vụ nếu chưa có dữ liệu tương ứng.

Upload thất bại trước commit: rollback DB/compensate asset, dọn temp. Nếu chưa xác định commit, trả 503 và giữ asset để retry cùng key; không tự tạo intent mới. Receipt replay không tạo bài/asset lần nữa. Chi tiết [upload lifecycle](../UPLOAD_LIFECYCLE_VI.md).

## Hai ví dụ xuyên hệ

- **Pending không public:** upload user → `songs.status=pending,is_visible=false` → catalog/detail/recommendation và `/api/media/:assetId` chặn guest/user → admin preview được phép → approve → lần đọc public tiếp theo hợp lệ. Preview admin không cấp quyền ghi playlist user.
- **Retry không double count:** player tạo UUID → POST activity → DB ghi receipt và view trong một transaction → response mất → cùng user/UUID/body retry → receipt 200 duplicate, view không tăng lại. Cùng UUID nhưng payload đổi → 409; DB fail không có ACK thành công.
