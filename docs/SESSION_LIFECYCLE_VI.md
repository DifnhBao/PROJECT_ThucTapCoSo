# T06 — Vòng đời phiên đăng nhập

## Policy v1

- Mỗi login tạo một family/session riêng bằng UUID và refresh credential 32 byte
  ngẫu nhiên (256 bit, base64url dài43). Database chỉ lưu SHA-256 digest dài64,
  không lưu raw refresh JWT/token. Không dùng SHA-256 để hash password.
- Access JWT chỉ chứa userId, role, scope, sessionId, iat, exp; hiệu lực tối đa
  30 phút và không vượt hạn family. Refresh family hết hạn tuyệt đối sau7 ngày
  kể từ login; rotation không kéo dài ngày hết hạn.
- Login, refresh, logout và đổi thông tin bảo mật dùng transaction. Thứ tự khóa
  luôn là user row trước token rows. Login kiểm tra password/role trong khóa;
  refresh consume token cũ và insert token mới cùng commit. Lỗi insert rollback
  cả consume, nên có thể thử lại. Không giữ khóa qua network provider calls.
- Rotation giữ family_id, ghi consumed_at/replacement_digest ở record cũ. Token
  kế tiếp được sinh bằng HMAC-SHA256 với JWT_REFRESH_SECRET, domain separator,
  family_id và token cũ; đầu vào login vẫn là CSPRNG. Cách này cho phép trả lại
  đúng kết quả đã commit khi mất response, mà không lưu raw credential.
- **Grace10 giây** tính từ consumed_at: retry cùng token chỉ trả lại successor
  nếu successor đó vẫn active, cùng family/scope. Không tạo thêm successor.
  Nếu family đã tiến thêm một bước, trả409 REFRESH_CONFLICT, không clear cookie
  hoặc revoke family vì race này. Client dừng refresh và báo lỗi; yêu cầu mới có
  thể dùng cookie hiện tại. Không có retry đệ quy.
- Reuse token consumed sau10 giây thu hồi toàn bộ family rồi trả401. Revocation
  phải commit trước khi phát lỗi ra ngoài transaction. Một login khác không bị
  ảnh hưởng. Token hết hạn, revoked, sai scope hoặc legacy bị401.
- Grace là đánh đổi có chủ ý: ai giữ token cũ trong10 giây cũng có thể nhận
  successor khi nó còn active. Không có sender binding và không khẳng định phân
  biệt được mất response hợp lệ với kẻ lấy cắp token trong cửa sổ này. Retry muộn
  hơn grace yêu cầu đăng nhập lại. Secret phải đồng nhất giữa các server; đổi
  secret cần kế hoạch invalidate/re-login.

## Thu hồi và kiểm tra quyền

- Logout dùng refresh cookie theo scope, không đòi access token còn hiệu lực.
  Thu hồi cả family, kể cả nhận token cũ đã consumed. Nếu không có cookie hoặc
  token không tồn tại, trả200 và vẫn clear hai cookie đúng scope/path.
- Đổi/reset password, promote/demote role: save thông tin và revoke **tất cả
  family của target** trong một transaction. Bản ghi đã thay đổi kể từ khi đọc
  bị409 SECURITY_STATE_CHANGED để tránh ghi đè credential/role stale.
- Middleware required và optional auth đều đối chiếu family active/unexpired
  với DB và role hiện tại. Sau commit revoke, request xác thực mới dùng access
  token cũ bị401 ngay, dù chữ ký/exp còn hợp lệ. Không cache session và không có
  fallback JWT-only khi DB hỏng. Request đã qua middleware trước commit có thể
  hoàn tất; đây không phải cơ chế hủy request đang chạy.
- User/admin cookies và scope độc lập; token bên này không refresh/logout family
  bên kia. Xóa user dùng FK cascade xóa các token, middleware từ chối access cũ.
- Logout phiên cuối của user chuyển activity_status thành offline; nếu còn
  phiên active khác thì giữ trạng thái. Trạng thái presence không phải quyền.

## Client và cookies

- Axios và fetch dùng chung refresh-session.ts, single-flight riêng user/admin.
  Mỗi request gốc chỉ retry một lần, kể cả khi response sau retry vẫn401.
  Refresh thất bại giải phóng queue, mọi waiter nhận lỗi; không retry refresh.
- Web Locks phối hợp theo scope giữa tab cùng origin nếu browser hỗ trợ.
  Browser không có Web Locks vẫn dùng single-flight trong tab và server grace.
  Response quá trễ sau nhiều rotation có thể mang cookie cũ; request tiếp theo
  bị conflict/re-login theo policy. Không cam kết xử lý mọi thứ tự network vô hạn.
- T07 cập nhật cookie HttpOnly/SameSite=Lax/Path=/, Secure chỉ production.
  Access maxAge khớp JWT TTL, refresh Expires khớp DB expiry. Login/refresh/logout
  trả Cache-Control:no-store. Origin/CSRF hiện hành xem SECURITY_POLICY_VI.md (T07).
- Login user giữ DTO tokens để tương thích T05; client hiện tại dựa vào cookies.
  Không ghi raw credentials vào logs. API contract vẫn dùng envelope T05.
- T12 đã hợp nhất transport, auth epochs và cache theo user/admin; xem
  [HTTP_ACCOUNT_CACHE_VI.md](HTTP_ACCOUNT_CACHE_VI.md). T06 giữ contract rotation
  phía server; kiểm chứng frontend riêng tại [verification/T12.md](verification/T12.md).

## Release và migration

1. Backup DB theo quy trình triển khai; dừng tất cả process phiên bản cũ có thể
   ghi auth/token trước khi migrate. Chưa chạy migration trên DB triển khai.
2. Chạy migration forward 20261026000100-refresh-sessions.js bằng DDL account
   theo DATABASE_SETUP_VI.md. Migration xóa các refresh row legacy không có
   family/scope; không xóa user/song/activity. **Mọi phiên cũ phải login lại**:
   refresh JWT cũ bị loại và access JWT không có sessionId bị từ chối.
3. Deploy backend/frontend cùng phiên bản. Không chạy lẫn server cũ/mới. Migration
   MySQL DDL tự commit, được viết để chạy lại sau ngắt giữa các bước. Không có
   down migration khôi phục credentials cũ; rollback app cần bản tương thích
   schema mới và yêu cầu re-login, không restore raw tokens.
4. Không tự sync schema. Không ghi access/refresh token vào telemetry. Token rows
   đã consume/revoke giữ lại tới ít nhất hạn family để phát hiện reuse; cleanup
   sau expiry là vận hành bảo trì tiếp theo, chưa có scheduled job trong T06.

## Tham chiếu

- [RFC9700, refresh-token protection](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2):
  rotation và quan hệ giữa các token giúp phát hiện replay. Grace10s và HMAC
  successor ở đây là quyết định thiết kế riêng, không phải yêu cầu của RFC.
- [Sequelize managed transactions/locking](https://sequelize.org/docs/v6/other-topics/transactions/):
  commit khi callback thành công, rollback khi throw; reuse revocation vì thế
  trả error sentinel trong callback rồi phát lỗi sau commit.
