# Permission matrix v1 — T01

Quyết định triển khai ngày 16/10/2026. Chỉ dùng identity từ JWT đã verify và
chuẩn hóa tại `req.auth`; body/query/params không được chọn actor.

| Thao tác | User | Admin | Super admin |
|---|---|---|---|
| Xem/sửa profile cá nhân | Chính mình | Chính mình qua admin endpoint | Chính mình qua admin endpoint |
| Xem profile theo ID qua admin API | Không | Có | Có |
| Sửa profile người khác qua admin API | Không | Chỉ target user thường | Chỉ target user thường |
| Reset password người khác | Không | Target user thường | Target user/admin |
| Reset password chính mình | Không | Không | Không |
| Đổi password chính mình | Mật khẩu hiện tại bắt buộc | Mật khẩu hiện tại bắt buộc | Mật khẩu hiện tại bắt buộc |
| Xóa tài khoản khác | Không | Target user thường | Target user/admin |
| Xóa chính mình hoặc target super_admin | Không | Không | Không |
| Tạo admin / promote / demote | Không | Không | Có; không thao tác target super_admin hoặc chính mình |
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
Refresh rotation/revocation/stale role của token đã phát hành là T06; T01 không
đánh dấu session security hoàn tất. Không claim HTTP+DB VERIFIED trước T04.
