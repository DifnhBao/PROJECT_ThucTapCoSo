# Ma trận quyền hiện tại

Identity lấy từ phiên đã xác thực, không nhận actor từ body/query. User scope và admin scope tách biệt; super_admin là role thuộc admin scope, không tự vượt mọi policy. “—” nghĩa không được phép; “chưa có” là capability không được expose, không phải quyền đã ship.

| Hành động | Guest | User | Admin | Super admin |
|---|---|---|---|---|
| Catalog/detail/search/similar và media bài public | Có | Có | Có qua public API | Có qua public API |
| Preview/catalog pending, approve/reject/update/hide/delete song | — | —, kể cả uploader preview private media | Có | Có |
| Upload song | — | Có, đủ hồ sơ; tạo pending | Có qua route admin | Có qua route admin |
| Favorite/rating, recommendation `/me`, ghi activity | — | Chính mình | — với admin scope | — với admin scope |
| Đọc playlist public | Có | Có | Có | Có |
| Đọc playlist private | — | Owner | Có | Có |
| Tạo/list playlist của mình, add/remove/delete | — | Owner | — với admin scope | — với admin scope |
| Xem hồ sơ chính mình | — | `/users/me` | `/users/admin/me` | `/users/admin/me` |
| Sửa hồ sơ chính mình / avatar | — | Có qua user routes | Chưa có route tự sửa profile/avatar cho admin | Chưa có route tự sửa profile/avatar cho super_admin |
| Đổi mật khẩu chính mình | — | Cần oldPassword | Cần oldPassword qua admin route | Cần oldPassword qua admin route |
| Xem danh sách user/admin và profile target | — | — | Có | Có |
| Sửa profile người khác | — | — | Chỉ target user | Chỉ target user |
| Reset password / xóa người khác | — | — | Chỉ target user | Target user hoặc admin |
| Reset/xóa self hoặc target super_admin | — | — | — | — |
| Tạo admin mới | — | — | — | Có; role tạo là admin |
| Promote/demote | Chưa có | Chưa có | Chưa có | Service có policy, routes vẫn tắt |
| Rebuild recommendation / song-pair debug | — | — | Có | Có |

Playlist private chỉ hạn chế **đọc** theo owner/admin; quyền đọc admin không cấp quyền sửa playlist. Ngay cả owner/admin đọc playlist cũng chỉ nhận các songs public. Tạo playlist hiện mặc định `is_public=true`, route create không expose privacy; không mô tả UI có nút đổi public/private.

Trên route bắt buộc đăng nhập, thiếu/invalid credential trả 401. Có identity hợp lệ nhưng sai scope/quyền: 403. Resource private/non-public hoặc không tồn tại: 404 theo policy che tồn tại. ID/body sai schema: 400; middleware thứ tự có thể từ chối auth trước validation. Có credential lỗi trên optional-auth playlist không được âm thầm hạ xuống guest. Public media vẫn được phục vụ khi song đủ eligibility dù cookie đăng nhập hết hạn; không dùng quy tắc optional-auth playlist để suy policy media.

Nguồn: [user routes](../../Server/src/routes/user.routes.js), [user policy](../../Server/src/policies/user.policy.js), [song routes](../../Server/src/routes/song.routes.js), [playlist service](../../Server/src/services/playlist.service.js), [publication policy](../../Server/src/policies/publication.policy.js). Kiểm chứng: [TC01/TC02/TC05/TC09](traceability.md).

Hiệu chỉnh tài liệu T01: câu cũ “xem/sửa profile cá nhân qua admin endpoint” gộp quá rộng; mounted routes hiện chỉ có GET admin/me và POST admin/change-password, không có route tự sửa profile admin. Quyền promote/demote ở service cũng không đồng nghĩa có API hoạt động.
