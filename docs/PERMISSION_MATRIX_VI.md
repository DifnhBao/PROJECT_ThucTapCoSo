# Permission matrix v1 — T01

Quyết định triển khai ngày 16/10/2026. Chỉ dùng identity từ JWT đã verify và
chuẩn hóa tại `req.auth`; body/query/params không được chọn actor.

| Thao tác | User | Admin | Super admin |
|---|---|---|---|
| Xem profile cá nhân | Chính mình | GET admin/me | GET admin/me |
| Sửa profile/avatar cá nhân | Chính mình qua user routes | Chưa có route self-update admin | Chưa có route self-update super_admin |
| Xem profile theo ID qua admin API | Không | Có | Có |
| Sửa profile người khác qua admin API | Không | Chỉ target user thường | Chỉ target user thường |
| Reset password người khác | Không | Target user thường | Target user/admin |
| Reset password chính mình | Không | Không | Không |
| Đổi password chính mình | Mật khẩu hiện tại bắt buộc | Mật khẩu hiện tại bắt buộc | Mật khẩu hiện tại bắt buộc |
| Xóa tài khoản khác | Không | Target user thường | Target user/admin |
| Xóa chính mình hoặc target super_admin | Không | Không | Không |
| Tạo admin | Không | Không | Có; role mới là admin |
| Promote / demote | Không có route hoạt động | Không có route hoạt động | Policy service có, routes chưa bật |
| Recommendation cá nhân | `/recommendations/me`, ID từ principal | Không dùng user scope | Không dùng user scope |
| Tạo/list playlist của mình | Có | Không dùng user scope | Không dùng user scope |
| Thêm/xóa bài, xóa playlist | Chỉ owner | Không dùng user scope | Không dùng user scope |

HTTP contract T01: anonymous/token lỗi/identity không hợp lệ trả 401; scope/role
hoặc admin action không được phép trả 403; playlist thiếu hoặc không thuộc owner
trả 404 thống nhất. ID target sai định dạng trả 400. JWT chỉ nhận userId là số
nguyên dương an toàn hoặc chuỗi chữ số tương ứng, role/scope phải khớp.

Route recommendation `/users/:userId` bị gỡ. Các trường userId trong query/body
của endpoint `/me` không được sử dụng để chọn người dùng. Profile update chỉ
nhận các trường profile cho phép, không nhận role/user_id/password từ body.

Publication/private playlist read policy là T02; T01 kiểm tra quyền các mutations.
Hiệu chỉnh tài liệu tại T22 (2026-11-13): tách xem/sửa self-profile và capability service khỏi route thực tế. Ma trận as-built đầy đủ tại [product/permission-matrix.md](product/permission-matrix.md); không thay đổi runtime policy.
Refresh rotation/revocation/stale role của token đã phát hành là T06; T01 không
đánh dấu session security hoàn tất. Không claim HTTP+DB VERIFIED trước T04.
