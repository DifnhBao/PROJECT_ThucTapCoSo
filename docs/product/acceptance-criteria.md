# Acceptance criteria của demo

Mỗi hàng có bốn loại tiêu chí: S thành công, V validation, P permission, F failure. Mã đầy đủ là `USxx-S/V/P/F`; truy vết test/evidence theo cùng US ở [traceability](traceability.md). Đây là tiêu chí của scope đã ship, không thêm yêu cầu triển khai tính năng mới.

| Story | S — thành công | V — dữ liệu | P — quyền | F — lỗi/phục hồi |
|---|---|---|---|---|
| US01 | Đăng ký/đăng nhập đúng scope, refresh hợp lệ, logout kết thúc phiên | Body sai schema bị từ chối; không cho body chọn role | User/admin session tách; revoked/stale session không được dùng | Refresh reuse bị từ chối; account B không nhận cache/pending event A; form lỗi giữ input |
| US02 | Tìm/mở bài public theo URL và phát đúng bài; queue, shuffle/repeat, next/previous hoạt động | ID lỗi bị từ chối; queue append dedupe, không trỏ index ngoài queue | Pending/rejected/hidden không lọt catalog/detail/similar/media public | Empty/error/404 khác nhau, có retry; media lỗi không tự tạo lượt nghe hợp lệ |
| US03 | Like hiển thị trong Likes; unlike bỏ khỏi state; rating hợp lệ được lưu | Rating 1–5; payload không được gán actor | Chỉ user chính mình, bài public | Mutation lỗi không hiển thị thành công giả; toggle không tự retry như thao tác có idempotency key |
| US04 | Tạo playlist public mặc định, thêm/xóa bài, xóa playlist của owner | Duplicate add 409; position không trùng khi concurrent adds | Mutate khác owner 404; private read chỉ owner/admin, guest chỉ public | Transaction fail rollback cả membership/order; conflict không hiển thị đã thêm thành công; bài hidden bị lọc ở lần đọc sau |
| US05 | Upload user tạo pending và receipt; retry cùng key/body không tạo song/asset mới | Đủ first/last name, key và metadata/file signature/size đúng | Guest không upload, user không tự publish bằng body | Network/ambiguous commit giữ key; cleanup pending/conflict/503 hiển thị lỗi, không tự tạo intent mới |
| US06 | Admin preview, approve→public, reject→không public; hide chặn lần đọc mới | Approve/reject non-pending 409, missing 404 | User không gọi admin API hoặc private media; super_admin có quyền moderation | Provider/DB fail không được coi thành công; không hứa thu hồi bytes đã buffer hoặc URL legacy |
| US07 | User nhận gợi ý public có explanation, cold user có fallback hợp lệ; rebuild publish snapshot hoàn chỉnh | Limit theo contract, eligibility trước top-K, không duplicate song | `/me` lấy user từ principal, debug/rebuild chỉ admin | Rebuild fail giữ snapshot cũ; catalog rỗng trả rỗng, không đưa pending vào; score không được quảng bá như độ chính xác |
| US08 | User sửa profile/avatar; tự đổi password bằng oldPassword đúng | Strict profile fields, password/file contract | Không đổi role/actor qua body; admin chỉ có self-password route, không claim tự sửa admin profile | Avatar replace fail giữ avatar cũ; stale response không thay principal mới; form lỗi giữ dữ liệu |
| US09 | Admin quản lý user; super_admin tạo admin/reset hoặc xóa target admin trong policy | Target ID/body đúng schema; admin mới có role admin cố định | Cấm admin→admin/super, cấm self reset/delete và target super_admin | Request bị cấm không hash/save password hoặc xóa target; promote/demote không được quảng bá là API hoạt động |
| US10 | Receipt finalized lưu bền và qualified view chỉ tăng một lần | UUID/version/counters/ranges hợp lệ; seek không tạo actual listened time | Actor từ user session; event mới chỉ cho bài public | Retry giống 200, payload khác 409; DB fail không ACK; mất response retry không double count; không hứa delivery khi tab/network chết |

## Điều kiện nghiệm thu ngoài phạm vi T22

T19/T21 là bằng chứng app/CI test, storage ngoài được mock. T22 chỉ đối chiếu tài liệu với code và bằng chứng sẵn có, không chạy lại DB/reset/demo hoặc công bố số liệu người dùng thật. HTTPS/cookies/audio/provider/cold start/rollback trên domain triển khai cần T23; release cuối cần T25.

KPI favorite conversion, retention TTL, journal moderation và các mục O01/O02/O03 không được đánh dấu đã đạt chỉ vì xuất hiện trong tài liệu.
