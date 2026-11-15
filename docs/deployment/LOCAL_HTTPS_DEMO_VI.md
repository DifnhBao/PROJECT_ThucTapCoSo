# Demo HTTPS miễn phí từ máy cá nhân — T23

Người dùng chọn phương án này thay Render + database Free bên ngoài ngày 2026-11-13. **Chi phí cloud mới: 0; đây là demo tạm thời, không phải hosting luôn online.** Máy và Docker Desktop phải chạy. Quick Tunnel không có SLA; URL có thể đổi khi tunnel khởi động lại. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Kiến trúc đang dùng

Browser HTTPS → Cloudflare Quick Tunnel → web Next tại loopback 127.0.0.1:3030 → Express → MySQL 8 trong private Docker network. Chỉ tunnel nhận kết nối Internet; không publish MySQL hoặc API trực tiếp. Project Compose riêng `tunetrek-t23-demo`, DB `tunetrek_demo_t23`; không dùng MySQL Windows hoặc database cá nhân.

API chạy production, chỉ chấp nhận HTTPS origin của tunnel hiện tại. Cookie Secure/HttpOnly/SameSite=Lax; app account chỉ DML, migrator riêng. Volumes giữ dữ liệu qua restart, API/web read-only; temp bounded và journal volume theo T20. Tài khoản Cloudinary hiện có được kiểm tra gói Free và dùng để smoke file tone tự sinh, không mock provider.

## Mở, xem trạng thái, dừng

Các lệnh từ `D:\code\TTCS-PROJECT`, sau khi mở Docker Desktop:

```powershell
node scripts/deploy/tunnel-demo.cjs start
node scripts/deploy/tunnel-demo.cjs status
node scripts/deploy/tunnel-demo.cjs stop
```

`start` dùng image đã kiểm chứng, xác minh image ID với manifest, không tự build/migrate/seed/reset. Khi tạo tunnel mới, cập nhật WEB_ORIGINS chính xác và recreate API trước khi trả link ready. Nếu tunnel còn chạy nhưng container đã dừng, start sẽ mở lại stack. `stop` chỉ dừng đúng process tunnel theo PID + executable path và project demo riêng; không xóa volume/backup.

Lần thiết lập đầu đã được thực hiện: sinh secrets riêng vào ignored `.local-backups/t23/stack.env`, chạy migration trên DB rỗng, seed synthetic explicit, rồi đổi password admin/super_admin khác listener. Không seed lại khi restart. File `.local-backups/t23/demo-login.txt` chứa tài khoản dùng thử riêng; chỉ mở tại máy, không commit hoặc paste nội dung vào chat. Không công khai mật khẩu quản trị.

Thông tin phiên hiện tại: `.local-backups/t23/demo-url.json`. Image ID và source candidate: `.local-backups/t23/demo-release.json`; Compose override pin image ở `.local-backups/t23/release.override.yml`. Các file này cần giữ để lệnh start tái sử dụng đúng bản demo. Binary cloudflared 2026.11.0 nằm ignored, đã xác minh SHA256 từ GitHub release chính thức; không cài Windows service hoặc sửa firewall/router.

## Dữ liệu và quyền

Catalog là synthetic, mặc định tone 440Hz tự sinh 6 giây. Không phải thư viện nhạc thương mại. Listener: demo_userA/demo_userB; admin dùng credential riêng trong file private. Không nhập email, dữ liệu cá nhân hoặc mật khẩu dùng ở nơi khác vào bản demo. Seed còn account super_admin, không chia sẻ credential của account đó.

Không có reset định kỳ. Muốn reset phải dừng tunnel/writers, backup, xác minh đúng DB demo và lập quy trình riêng; **không chạy down -v hoặc test reset** trong thao tác mở/dừng. Database Filess chỉ đã kiểm tra read-only, chưa migrate/seed và không được dùng cho demo này. Render và dịch vụ có sẵn không bị thay đổi.

## Nghiệm thu và các lỗi đã tìm thấy

- Browser thật, không route mocks: login, playback qua HTTPS, favorite, playlist, upload Cloudinary thật ở pending, admin duyệt, phát qua authenticated gateway, reject user admin API/hostile Origin, refresh bằng access JWT hết hạn, logout bằng UI.
- Proxy HTTPS làm PATCH rỗng có transfer framing và backend trả 415. Regression consumer test đã tái hiện; shared fetch gửi JSON `{}` cho mutation không body/Content-Type. Multipart và body có sẵn giữ nguyên, backend không nới Content-Type policy. Bản sửa đã qua unit và browser thật.
- Restart giữ session/library; DB stop tạo ready503 nhưng live200; DB lên lại dữ liệu còn. Backup khi dừng writes, restore vào tên DB riêng có hash/row checks. Không chuyển app sang DB restore.
- Đã rollback API về image T20 từng kiểm chứng với schema hiện tại, xác minh library/session, sau đó quay về đúng image đang thử. Frontend không rollback về bản có lỗi 415. Lượt thử đầu phát hiện so sánh với mutable image tag; runner đã pin image ID trước thử và lượt cuối đạt.

Runtime evidence tại [T23](../verification/T23.md). CI candidate cần đạt riêng; runtime smoke không thay cho CI, và metadata kết thúc được ghi tại workspace/PR để tránh commit vòng lặp chỉ ghi kết quả của chính nó. Chưa merge main hoặc publish release tag/GHCR trong chế độ demo tạm này.

## Backup và phục hồi

Dùng [operations runbook](../OPERATIONS_VI.md) với `--stack-env .local-backups/t23/stack.env --project tunetrek-t23-demo`. Backup thật và restore result giữ trong ignored backup; metadata an toàn nằm trong evidence. Không đưa SQL/cookie/token/provider key lên Git hoặc artifact.

Nếu demo lỗi: kiểm tra `status`, mở Docker Desktop, xem log của đúng project và health. Nếu đổi source/schema, cần snapshot + CI + build lại, kiểm tra compatibility rồi cập nhật manifest/pinned images; start không tự triển khai source đang sửa. Rollback code không tự rollback schema. File media ở Cloudinary không nằm trong SQL backup.
