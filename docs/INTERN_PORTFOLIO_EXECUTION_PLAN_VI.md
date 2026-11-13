# Kế hoạch thực hiện: vá TuneTrek thành side project đủ tốt cho CV Intern

**Ngày lập:** 16/10/2026. **Đối tượng:** Full-stack Developer Intern; bổ sung hồ sơ Business Analyst.

**Nguồn:** [Technical Audit](audit/TECHNICAL_AUDIT_VI.md) và [kết quả kiểm chứng](audit/evidence/verification.md).

Đây là tài liệu giao việc và nghiệm thu, không phải xác nhận đã sửa lỗi. Tất cả công việc bên dưới bắt đầu ở trạng thái **TODO**. Chỉ đánh dấu hoàn tất khi có bằng chứng kiểm tra tương ứng.

Các đường dẫn trong tài liệu tính từ `D:/code/TTCS-PROJECT`. Dòng code dẫn từ audit là vị trí ban đầu; có thể thay đổi sau refactor. Các file ghi **“tạo mới”** và npm scripts ghi **“cần bổ sung”** chưa được coi là có sẵn.

## 1. Đích đến và giới hạn phạm vi

### Khi nào dự án đủ điều kiện đưa vào CV?

Phiên bản `portfolio-v1` cần đáp ứng đủ các điều sau:

1. Clone sạch có thể chạy toàn bộ ứng dụng theo README, không phụ thuộc file/secret chỉ có trên máy tác giả.
2. Các luồng đăng nhập, nghe nhạc, tìm kiếm, yêu thích, playlist, gợi ý và kiểm duyệt chạy hoàn chỉnh.
3. Không còn lỗi leo quyền, đọc chéo dữ liệu cá nhân hoặc trả nhạc chưa được phép công khai ở các luồng đã xác định.
4. Refresh session, dữ liệu nghe nhạc và playlist có hành vi nhất quán khi retry, mất mạng hoặc request đồng thời.
5. Typecheck, lint, tests và production build đạt trong CI; không dùng cấu hình bỏ qua lỗi để có trạng thái xanh.
6. Mobile sử dụng được; người dùng nhìn thấy loading/error/empty states và có cách phục hồi khi lỗi.
7. Recommendation có giải thích phù hợp, fallback cho người mới và đánh giá đúng phương pháp; ghi rõ dữ liệu tổng hợp nếu dùng dữ liệu tổng hợp.
8. Có demo HTTPS, README, architecture diagram, ERD, video ngắn và bản ghi đóng góp cá nhân.
9. Có ít nhất một câu chuyện kỹ thuật với bằng chứng: sửa lỗi phân quyền, xử lý concurrency, tối ưu query hoặc đánh giá recommendation.
10. Chỉ ghi vào CV các tính năng đã ship và số liệu đã đo; có tài liệu giải thích hạn chế.

**Không bắt buộc cho mốc này:** microservices, Kubernetes, Redis, WebSocket, chatbot AI, NCF chạy production, daily mix tự động, SLA thương mại hoặc lượng người dùng thật. Giữ Next.js + Express + MySQL + Cloudinary và Node recommendation làm kiến trúc chính. Phần Python có thể được lưu như nghiên cứu độc lập.

### Cách sử dụng backlog

- Thực hiện theo số thứ tự **T00 → T25**. Dependencies ghi trong bảng giúp biết điều kiện trước khi bắt đầu.
- Mỗi task nên thành một PR hoặc một nhóm commit có cùng mục đích; không gom auth, CSS và migration vào một thay đổi lớn.
- Trạng thái dùng: `TODO → IN_PROGRESS → IMPLEMENTED → VERIFIED`. `IMPLEMENTED` chưa đồng nghĩa hoàn thành nếu còn thiếu kiểm thử tích hợp.
- Mỗi task lưu: commit/PR, lệnh kiểm tra, kết quả, ảnh/log cần thiết và hạn chế còn lại trong `docs/verification/Txx.md` (**tạo mới khi làm task**).
- Kiểm tra trên database riêng. Không chạy seed, test cleanup hoặc migration thử nghiệm vào dữ liệu đang sử dụng.
- Các ngưỡng/rule ghi **“đề xuất v1”** là quyết định triển khai mới, không phải mô tả hành vi hiện có. Ghi vào business rules trước khi code.

## 2. Bảng thứ tự thực hiện

| Xong | Task | Công việc | Mức ưu tiên | Phụ thuộc chính |
|---|---|---|---|---|
| [ ] | [T00](#t00) | Chốt scope, lưu baseline, dựng khung kiểm thử | Nền tảng | — |
| [ ] | [T01](#t01) | Sửa leo quyền và truy cập chéo người dùng | P0 | T00 |
| [ ] | [T02](#t02) | Thống nhất quyền xem bài hát/playlist | P0 | T00, T01 |
| [ ] | [T03](#t03) | Secrets, dữ liệu demo, dependency và config | P1 | T00 |
| [x] | [T04](#t04) | Chuẩn hóa migrations, schema và seed — [VERIFIED trên MySQL test](verification/T04.md) | P1 | T03 |
| [x] | [T05](#t05) | Validation, error handling và API contract — [VERIFIED trên môi trường test](verification/T05.md) | P1 | T01, T04 |
| [x] | [T06](#t06) | Sửa refresh token và thu hồi phiên | P1 | T04, T05 |
| [x] | [T07](#t07) | Chống abuse, chốt cookie/CORS/CSRF | P1 | T03, T05, T06 |
| [x] | [T08](#t08) | Sửa upload và xử lý partial failure | P1 | T02, T04, T05, T07 |
| [x] | [T09](#t09) | Sửa transaction và race của playlist | P1 | T02, T04, T05 |
| [x] | [T10](#t10) | Sửa queue, shuffle, repeat và audio errors | P1 | T00 |
| [x] | [T11](#t11) | Sửa logging nghe nhạc và lưu event bền vững | P1 | T04, T05, T07, T10 |
| [x] | [T12](#t12) | Một HTTP client, refresh và cache theo user | P1 | T05, T06, T10, T11 |
| [x] | [T13](#t13) | Dọn code, sửa types, bật quality gates | P1 | T03, T12 |
| [x] | [T14](#t14) | Chuẩn hóa và giới hạn chi phí recommendation | P1 | T02, T04, T11, T13 |
| [x] | [T15](#t15) | Sửa benchmark và đánh giá recommendation | P1 | T14 |
| [x] | [T16](#t16) | Hoàn thiện trang, deep links và UI states | P2 | T10, T12, T14 |
| [x] | [T17](#t17) | Responsive và accessibility | P2 | T16 |
| [x] | [T18](#t18) | Đo và sửa frontend performance | P2 | T13, T17 |
| [x] | [T19](#t19) | Hoàn thiện regression/integration/E2E suite | P1 | T01–T18 |
| [x] | [T20](#t20) | Docker toàn stack, health, logs và shutdown | P1 | T03, T04, T06, T11, T19 |
| [x] | [T21](#t21) | CI và quy trình release | P1 | T19, T20 |
| [x] | [T22](#t22) | Hoàn thiện tài liệu nghiệp vụ BA | P2 | Rule đã chốt ở các task trước |
| [ ] | [T23](#t23) | Deploy demo và kiểm tra vận hành | P1 | T20, T21, T22 |
| [ ] | [T24](#t24) | README, showcase và nội dung CV | P1 | T15, T18, T22, T23 |
| [ ] | [T25](#t25) | Nghiệm thu cuối và chốt portfolio-v1 | Cổng phát hành | T00–T24 |

P0: chặn public demo. P1: bắt buộc trước mốc CV. P2: hoàn thiện trải nghiệm và khả năng trình bày; vẫn thuộc scope v1 ở bảng này. P1 ở cuối danh sách là công việc tích hợp, không có nghĩa được bỏ qua. Không đợi T19 mới viết tests: mỗi task logic phải thêm regression tests ngay khi sửa; T19 hoàn thiện và kết nối chúng.

## 3. Hướng dẫn chi tiết từng công việc

<a id="t00"></a>

### T00 — Chốt scope, lưu baseline và dựng khung kiểm thử

**Vị trí:** `docs/audit/`, `Server/src/server.js`, `Server/package.json`, `UI/package.json`, các thay đổi đang có trong working tree.

**Cách làm:**

1. Ghi lại `git status`, các file đã sửa và dữ liệu cần giữ. Không dùng reset/clean để làm repo “sạch”. Đặt tên nhánh theo loại công việc và mô tả ngắn, ví dụ `chore/t00-test-foundation`, `fix/authorization-policy` hoặc `feat/playlist-sharing`. Tên nhánh, thông điệp commit và các tên/nhãn Git khác không dùng tên công cụ hay model AI. Nếu chưa rõ quy ước, hỏi lại chủ dự án trước khi đặt tên.
2. Chốt demo path v1: guest khám phá nhạc; user đăng ký/đăng nhập → phát → like → playlist → gợi ý; admin upload/duyệt. Đưa Following/Daily Mix/comment chưa hoạt động vào danh sách ẩn hoặc làm sau.
3. Tách Express app factory/export vào `Server/src/app.js` (**tạo mới**). `server.js` chỉ load config, kết nối DB, listen và shutdown. Import app trong test không được tự mở port, timer hoặc kết nối production.
4. Thêm khung unit/API tests trong `Server/tests/`, unit/component tests trong `UI/tests/`; bổ sung scripts test phù hợp. Mock Cloudinary và các side effects; giữ một nhóm integration riêng chạy MySQL test sau T04.
5. Tạo biến/config test riêng, với guard từ chối chạy test phá dữ liệu nếu database không phải tên/host test đã cho phép. Không dùng fallback sang DB dev/production khi thiếu biến.
6. Lưu baseline hiện tại: hai lỗi TypeScript, số lint và audit trong báo cáo; kết quả mới nếu đã thay đổi. Phân biệt lỗi cũ với lỗi phát sinh do sửa chữa.

**Kết quả mong đợi:** có scope rõ và môi trường để sửa từng lỗi mà không ảnh hưởng dữ liệu thật; tests không boot cả server ngoài ý muốn.

**Nghiệm thu:**

- [ ] Một test import app chạy xong và thoát, không treo bởi timer/server.
- [ ] Một test player thuần chạy không cần browser hoặc DB.
- [ ] Có danh sách scope v1 và các thay đổi ban đầu cần giữ.

**Bàn giao:** khung tests, app export và `docs/verification/T00.md`.

<a id="t01"></a>

### T01 — Sửa leo quyền và quyền truy cập theo đối tượng

**Vị trí:** `Server/src/services/user.service.js:251–300`, `src/midlewares/auth.midleware.js`, `src/services/auth.service.js`, `src/routes/user.routes.js`, `src/controllers/recommendation.controller.js:62–69`, frontend recommendation API.

**Cách làm:**

1. Thêm test tái hiện admin thường reset password target super_admin. Test phải xác nhận hàm lưu password không được gọi khi bị từ chối.
2. Chuẩn hóa authenticated principal tại middleware, ví dụ `req.auth = { userId, role, scope, sessionId }`. `userId` phải được validate là integer dương; không truyền tùy tiện cả decoded JWT vào business logic.
3. Sửa self-check bằng hai trường thực sự tồn tại, ví dụ `targetUser.user_id === req.auth.userId` sau chuẩn hóa kiểu. Không chỉ sửa một dòng rồi bỏ qua các chỗ dùng `id/user_id/userId` khác.
4. Tách policy thành hàm rõ nghĩa như `canResetPassword(actor, target)`. Chính sách v1 đề xuất: admin reset user thường; không reset admin khác/super_admin; super_admin reset user/admin; super_admin không reset super_admin khác. Đổi mật khẩu chính mình đi qua flow yêu cầu mật khẩu hiện tại hoặc reauthentication.
5. Đổi recommendation cá nhân sang `/api/recommendations/me`, dùng ID từ principal. Sửa frontend cùng PR; xóa route userId cũ hoặc bắt buộc kiểm tra ownership nếu còn giữ tạm.
6. Rà thêm update profile, playlist mutations và admin APIs: ID target không phải bằng chứng quyền. Áp dụng policy ở backend, không dựa vào nút bị ẩn trên UI.

**Kết quả mong đợi:** tài khoản chỉ thực hiện được thao tác phù hợp với role và ownership; không còn `undefined === undefined` làm vượt quyền.

**Nghiệm thu:**

- [ ] Anonymous nhận401; authenticated nhưng thiếu quyền nhận403 hoặc404 theo contract đã chọn.
- [ ] Admin → super_admin/admin khác bị từ chối và DB không đổi.
- [ ] UserA không lấy recommendations/profile riêng hoặc sửa playlist của userB.
- [ ] Happy path hợp lệ vẫn chạy. Test policy chạy ngay; kiểm chứng HTTP+DB thật sau T04 trước khi đánh dấu VERIFIED.

**Bàn giao:** permission matrix sơ bộ, policy tests và API regression tests. **Giá trị CV:** RBAC và object-level authorization có kiểm chứng.

<a id="t02"></a>

### T02 — Thống nhất quyền xem bài hát và playlist

**Vị trí:** `Server/src/services/recommendation/recommendation.service.js:803–856`, `src/routes/recommendation.routes.js:20`, `src/services/playlist.service.js`, song/favorite/search read paths.

**Cách làm:**

1. Viết rule chung: bài public phải `status = approved AND is_visible = true`. Tạo scope/helper dùng tại repository query hoặc service, không lặp các điều kiện khác nhau ở từng controller.
2. Áp dụng vào search, song detail, similar songs, trending fallback, playlist detail, favorite detail và add-song-to-playlist. Lọc eligibility trước top-K; không trả pending khi catalog approved rỗng.
3. Debug recommendation chỉ dành cho admin hoặc tắt ở production. Nếu cần demo explanation, chỉ trả breakdown của bài public, không thông tin nội bộ toàn hệ.
4. Private playlist chỉ owner hoặc role được phép xem; public playlist chỉ chứa dữ liệu bài đủ điều kiện public. Chọn404 cho resource không được phép biết tồn tại và dùng nhất quán.
5. Tách admin preview khỏi public read. Nếu pending audio cần thực sự private, dùng cơ chế private/signed delivery của storage; chỉ giấu URL trong UI không bảo vệ được URL public đã biết.
6. Tạo fixture approved/pending/rejected/hidden/deleted; kiểm tra cả playlist cũ chứa bài vừa bị ẩn. Không thay đổi business rule bằng cách ép mọi bản ghi thành approved.

**Kết quả mong đợi:** một bài chưa được phát hành không xuất hiện hoặc lộ media qua API public; playlist privacy được thực thi tại server.

**Nghiệm thu:**

- [ ] Tất cả public read paths loại pending/rejected/hidden.
- [ ] Catalog toàn pending trả danh sách rỗng hợp lệ.
- [ ] Owner/admin preview được đúng phạm vi, user khác không xem được private playlist.
- [ ] Không còn public debug có thể dựng ma trận hoặc trả URL arbitrary song.

**Bàn giao:** publication policy + tests theo ma trận trạng thái. **Giá trị CV:** bảo vệ business rules xuyên nhiều API.

<a id="t03"></a>

### T03 — Secrets, dữ liệu demo, dependencies và cấu hình môi trường

**Vị trí:** `.gitignore`, `.env.example` đang bị xóa trong working tree, `Server/.env.example`, `UI/hash.js:3`, `Benchmark/benchmark.js:40`, SQL dumps, package/lockfiles, `UI/next.config.ts:11`, `UI/app/lib/http.ts:5`, `Server/config/config.js`.

**Cách làm:**

1. Quét secret trên tracked source và toàn lịch sử Git bằng công cụ secret scanner; log chỉ lưu loại secret/vị trí, không giá trị. Kiểm tra archive/dump trước khi public. `.env` tồn tại cục bộ không mặc nhiên là đã bị lộ.
2. Bỏ token literal trong benchmark và password hardcode. Với secret thật xác nhận từng public: thu hồi/rotate tại provider trước, rồi xử lý lịch sử có phối hợp; xóa ở commit mới không thu hồi secret.
3. Loại dữ liệu cá nhân thật khỏi seed công khai; giữ bản backup riêng khi cần. Tạo dữ liệu giả ở T04. Gỡ ZIP, temp MP3 và local virtual environment khỏi phần deliverable sau khi xác nhận không phải nguồn duy nhất cần giữ.
4. Chạy lại dependency audit tại thời điểm sửa. Update từng nhóm Next/React/lint và backend packages lên bản tương thích đã vá; cập nhật lockfile, chạy regression. Không chạy `audit fix --force` rồi chấp nhận mọi major change.
5. Chọn topology v1: browser gọi cùng origin `/api`, Next/reverse proxy chuyển tới API bằng cấu hình server. Xóa IP VPS hardcode và fallback localhost trong bản production. Không đưa internal URL/secret vào `NEXT_PUBLIC_*`.
6. Chuẩn hóa env mẫu với tên biến, mục đích, giá trị placeholder; ghi rõ build-time/runtime. Giữ `.env` thật ngoài Git/image. App dùng DB user quyền tối thiểu; DB_PORT phải áp dụng cả runtime và migration config.
7. Load/validate env trước khi import module cần config; validate required config lúc boot. DB/config lỗi thì startup thất bại rõ ràng, không listen và báo khỏe. Hoàn thiện probes ở T20.

**Kết quả mong đợi:** clone sạch có đủ hướng dẫn cấu hình; source không chứa credential/PII thật; dependencies có báo cáo triage cập nhật.

**Nghiệm thu:**

- [ ] Không còn secret thật trong deliverable; các finding của scanner có kết luận.
- [ ] Không còn critical/high có đường khai thác áp dụng mà chưa vá/giảm thiểu; finding không áp dụng có lý do, không suppress hàng loạt.
- [ ] API URL không trỏ cứng tới máy tác giả; thiếu env fail với thông báo không lộ secret.
- [ ] `npm ci` cài lại được theo lockfiles; test auth/upload cơ bản vẫn pass.

**Bàn giao:** env examples, dependency triage, config module, danh sách artifacts đã xử lý.

<a id="t04"></a>

### T04 — Chuẩn hóa schema, migrations và synthetic seed

**Vị trí:** `docker-compose.yml:14`, `db/init.sql`, root `init.sql`, `Server/migrations/`, `Server/src/models/`, `Server/config/config.js`.

**Cách làm:**

1. Chọn migrations làm nguồn schema chính; dump không còn là cách khởi tạo mặc định. Ghi rõ file nào chỉ là snapshot lưu trữ/fixture.
2. Dựng database test rỗng và chạy toàn bộ migrations; so schema cuối với Sequelize models, bao gồm song_similarities, UserActivities, refresh tokens và playlist positions.
3. Sửa ownership migration genres/song_genres bị tạo trùng; nếu đã có database deployed, ưu tiên migration bổ sung tiến về phía trước. Không sửa/xóa migration đã áp dụng rồi kỳ vọng DB cũ tự đổi.
4. Chốt xử lý partition UserActivities. Cho scope intern, có thể dùng bảng event không partition để đơn giản hóa unique/FK, nhưng cần migration chuyển dữ liệu. Nếu giữ partition, đồng bộ composite PK với model và dùng receipt table riêng cho dedupe ở T11.
5. Tạo seed có tên script rõ ràng: tài khoản userA/userB/admin/super_admin test, nhiều thể loại, hơn20 bài để kiểm tra pagination, các trạng thái bài, public/private playlists và user cold-start. Seed cần có guard chỉ chạy trong môi trường demo/test đã chọn.
6. Thêm scripts `db:migrate`, `db:seed:demo`, `db:seed:test` (**cần bổ sung**); script seed idempotent hoặc từ chối chạy lại rõ ràng. Password demo lấy từ env/fixture test theo từng môi trường.

**Kết quả mong đợi:** một database mới có thể đạt schema đúng mà không dùng dump cá nhân; dữ liệu demo tái lập và đủ edge cases.

**Nghiệm thu:**

- [x] Từ DB rỗng → migrate → seed → API đọc dữ liệu thành công.
- [x] Chạy migrate lần hai không đổi schema bất ngờ; seed không tạo bản ghi trùng ngoài chủ đích.
- [x] Model/schema đồng nhất; unique/FK cần thiết có thật trong DB.
- [x] Chạy lại integration tests T01/T02 trên MySQL test và lưu bằng chứng ở [T04](verification/T04.md); phạm vi còn lại của T01/T02 ghi trong báo cáo riêng.

**Bàn giao:** migrations sửa lỗi, seed và hướng dẫn DB. **Giá trị CV:** schema lifecycle có thể tái lập.

<a id="t05"></a>

### T05 — Request validation, AppError và API contract

**Vị trí:** `Server/src/midlewares/error.midleware.js`, controllers song/rating/playlist/auth/activity, `UI/app/features/*/*api*`.

**Cách làm:**

1. Tạo schema cho params/query/body tại boundary: IDs là integer dương; page ≥1; limit trong khoảng1–100; search q là string có giới hạn; enum/range đúng kiểu; từ chối unknown fields cho mutations nhạy cảm.
2. Dùng thư viện validation đã chọn trong audit, ví dụ Zod, tại server. Validation UI hỗ trợ trải nghiệm nhưng không thay thế validation backend.
3. Tạo AppError có `code`, `status`, `message`, chi tiết an toàn. Bỏ map lỗi theo substring tiếng Việt. Chuyển lỗi not-found/permission/duplicate/validation sang mã ổn định.
4. Chuẩn success envelope, ví dụ `{data, meta}`; error `{error:{code,message,details}, requestId}`. Với204 không trả body. Định nghĩa400/401/403/404/409/422/429/500 và dùng thống nhất.
5. Global handler nhận malformed JSON, validation, unique constraint và lỗi bất ngờ; lỗi500 chỉ trả message an toàn, log nội bộ có requestId. Kiểm tra headersSent trước xử lý lỗi muộn.
6. Cập nhật frontend adapters cùng API thay đổi; viết OpenAPI cho các luồng dùng trong demo. Không đổi response backend hàng loạt mà để UI mapper dùng contract cũ.

**Kết quả mong đợi:** input sai không tạo500 tùy tiện; client phân biệt được hết phiên, thiếu quyền, dữ liệu không tồn tại và lỗi server.

**Nghiệm thu:**

- [x] ID âm, limit cực lớn, q array/object, rating ngoài khoảng và JSON hỏng bị từ chối đúng contract.
- [x] Bài không tồn tại nhận404; duplicate phù hợp nhận409; internal SQL/stack/secret không xuất hiện trong response.
- [x] Contract tests và các UI consumers tương ứng pass — xem [T05](verification/T05.md).

**Bàn giao:** validators, AppError, global handler, OpenAPI và DTO/mapper cập nhật.

<a id="t06"></a>

### T06 — Refresh token, rotation và thu hồi session

**Vị trí:** `Server/src/models/refresh_token.model.js`, `src/services/auth.service.js`, `src/controllers/auth.controller.js`, `src/services/user.service.js`, auth middleware.

**Cách làm:**

1. Thay raw refresh JWT bằng token ngẫu nhiên đủ entropy; chỉ lưu digest, ví dụ SHA-256 của token ngẫu nhiên, không hash password theo cách này. Access JWT giữ claims tối thiểu.
2. Migration session/token record có userId, scope, expiry, revokedAt và định danh rotation/family nếu dùng reuse detection. Digest cố định tránh lỗi VARCHAR255; uniqueness dựa trên giá trị ngẫu nhiên.
3. Refresh trong transaction: kiểm tra token chưa hết hạn/chưa revoke; khóa hoặc conditional update để token cũ chỉ được tiêu thụ một lần; tạo token mới và vô hiệu token cũ một cách nguyên tử.
4. Chốt policy request refresh đồng thời: client single-flight theo scope, server xử lý rõ token cũ đã consumed. Nếu hỗ trợ nhiều tab, có cơ chế phối hợp hoặc grace policy có giới hạn; không vô tình log out người dùng chỉ vì race thông thường mà không có test.
5. Password reset/change và role change revoke sessions theo policy v1. Để access token cũ mất hiệu lực ngay, middleware đối chiếu session/tokenVersion với DB; nếu chọn độ trễ tới access expiry phải ghi rõ và test, không tuyên bố revoke tức thì.
6. Cookie TTL khớp expiry; logout revoke server session rồi clear cookie đúng path/options. Migration từ tokens cũ có release note yêu cầu đăng nhập lại; không để raw legacy refresh tokens sống vô thời hạn.

**Kết quả mong đợi:** login không lỗi với username dài, refresh an toàn trước retry/concurrency và reset password thực sự thu hồi phiên theo cam kết.

**Nghiệm thu:**

- [x] Username100 ký tự đăng nhập được; hai login cùng giây không collision.
- [x] Refresh thành công thay token; token hết hạn/revoke bị từ chối.
- [x] Logout/reset/change role vô hiệu hóa session theo policy đã ghi; user/admin scope không dùng lẫn.
- [x] Concurrent refresh và response retry có test, không gây vòng lặp frontend.

**Bàn giao:** session migration, auth services/cookies cập nhật, session lifecycle tests.

<a id="t07"></a>

### T07 — Rate limits, quota và cookie/origin policy

**Vị trí:** `Server/src/server.js`, auth/upload/activity/recommendation routes, cookie options trong auth controller.

**Cách làm:**

1. Rate limit login theo IP và account identifier; không trả thông báo giúp phân biệt account có tồn tại. Chọn ngưỡng ban đầu theo demo, ghi vào env/config và test thay vì hardcode rải rác.
2. Giới hạn upload theo user, dung lượng/request và số request; giới hạn activity rate/body size. Chặn trigger rebuild liên tục; không cho public request tính toán toàn bộ dữ liệu.
3. Với một API instance demo có thể bắt đầu bằng limiter trong process; ghi rõ reset khi restart. Nếu scale nhiều instance phải dùng shared store trước khi tuyên bố quota toàn hệ.
4. Chốt origin allowlist theo môi trường. Với topology same-origin v1, cân nhắc SameSite=Lax và Secure trên HTTPS; nếu giữ cross-site cookies thì cần policy CSRF/origin phù hợp và test thực tế.
5. Kiểm tra Origin/Fetch Metadata hoặc CSRF token cho mutation theo thiết kế đã chọn; CORS không thay thế authentication. Cấu hình trusted proxy chính xác theo hạ tầng để tránh IP spoof/bypass limiter.
6. Trả429 với Retry-After và UI message phù hợp; log sự kiện abuse không chứa password/token. Bổ sung security headers phù hợp, kiểm tra không phá media/font player.

**Kết quả mong đợi:** các endpoint tốn tài nguyên và auth không bị gọi vô hạn; cookie hoạt động đúng trong môi trường demo.

**Nghiệm thu:**

- [x] Vượt quota bị429; request hợp lệ sau khoảng chờ thành công.
- [x] Origin không được phép không thực hiện mutation; CORS/CSRF policy test với cookie thật trên topology đã chọn.
- [x] Header proxy giả không làm đổi identity IP ngoài trust policy.

**Bàn giao:** limiter/config, cookie/origin decision và tests.

<a id="t08"></a>

### T08 — Upload an toàn và không để lại file/asset mồ côi

**Vị trí:** `Server/src/routes/song.routes.js`, `src/midlewares/upload.midleware.js`, `src/controllers/song.controller.js`, `src/services/song.service.js`.

**Cách làm:**

1. Kiểm tra auth, role/profile và quota trước middleware ghi multipart file nếu các điều kiện không phụ thuộc body multipart.
2. Validate metadata, số file, kích thước và chữ ký định dạng; không chỉ tin MIME client. Tách trường image/audio và reject file không hợp lệ trước khi publish.
3. Di chuyển điều phối sang upload use case; storage adapter giữ Cloudinary public_id và resource_type để cleanup đúng asset. Mock adapter trong test.
4. Dùng finally xóa temp file cho cả success, validation return, cloud error và DB error. Audio upload thành công nhưng image/DB thất bại phải có compensating cleanup; cleanup lỗi cần được ghi nhận để retry, không nuốt im lặng.
5. Không giữ DB transaction mở trong suốt network upload dài. Upload trước rồi transaction lưu song/relations; khi transaction fail thì bù trừ storage. Tách hydrate response khỏi try/rollback của transaction đã commit.
6. Quy định idempotency cho thao tác create khi client retry sau mất response; ràng buộc theo user+request key và cùng payload, tránh tạo bài/asset trùng.

**Kết quả mong đợi:** upload lỗi không làm đầy disk hoặc tạo bài nửa chừng; thao tác retry không gây trùng ngoài chủ đích.

**Nghiệm thu:**

- [x] Thiếu title/profile, sai file, quá size đều không để lại temp files.
- [x] Giả lập cloud image fail, DB fail và response-read fail sau commit; trạng thái cuối được xác định đúng.
- [x] Pending upload chỉ hiển thị ở scope được phép theo T02.

**Bàn giao:** upload use case/storage adapter, cleanup mechanism và failure-path tests.

<a id="t09"></a>

### T09 — Playlist transaction và concurrency

**Vị trí:** `Server/src/services/playlist.service.js:44–55,130–136`, playlist model/migration/controller.

**Cách làm:**

1. Khi thêm bài, mở transaction và khóa parent playlist bằng row lock trước khi đọc max position. Kiểm tra ownership và publication trong cùng use case.
2. Trong transaction, xác định bài đã tồn tại và position kế tiếp; insert rồi commit. Giữ unique constraints làm lớp bảo vệ cuối, map conflict có nghĩa thay vì trả500.
3. Chốt duplicate-add policy: trả item hiện có theo kiểu idempotent hoặc409; frontend xử lý đúng policy. Hai request thêm hai bài khác nhau phải giữ được cả hai.
4. Nếu có reorder, validate đủ IDs thuộc playlist, không trùng/thiếu; update positions trong transaction bằng chiến lược không đụng unique constraint giữa chừng.
5. Xóa playlist bằng cascade đã có hoặc transaction gồm join rows+parent. Không xóa join rows trước rồi bỏ parent lại nếu lỗi.

**Kết quả mong đợi:** thêm/sắp xếp/xóa playlist không mất dữ liệu hoặc position lỗi khi request đồng thời.

**Nghiệm thu:**

- [x] Hai concurrent adds khác bài đều tồn tại, positions không trùng.
- [x] Hai adds cùng bài tuân thủ duplicate policy.
- [x] Unauthorized/hidden-song mutation bị từ chối, rollback không đổi dữ liệu.
- [x] Test concurrency chạy với MySQL thật, không chỉ mock.

**Bàn giao:** playlist use cases và integration tests. **Giá trị CV:** xử lý race condition bằng transaction/locking.

<a id="t10"></a>

### T10 — Sửa player queue, shuffle, repeat và phục hồi audio

**Vị trí:** `UI/app/features/player/playerService.ts`, `context/PlayerContext.tsx`, `hook/useAudioEngine.ts`, `components/Player.tsx`.

**Cách làm:**

1. Viết tests invariants: queue rỗng không crash; currentTrack luôn trùng bài audio; bật/tắt shuffle không đổi bài đang nghe; next/prev/repeat có hành vi rõ.
2. Chụp current song ID trước khi đổi shuffle mode, dựng order mới và tìm lại index theo ID. Không lấy currentTrack sau khi getter đã đổi sang shuffled array rỗng.
3. Quản lý queue với source, cursor/page, hasMore và generation/request ID. Fetch đầu tiên đúng page; khi chọn playlist mới, reset cursor và bỏ kết quả request từ generation cũ.
4. Không prefetch khi chưa có queue cần mở rộng. Dừng khi trang rỗng; dùng in-flight guard; retry hữu hạn/backoff cho lỗi mạng. Loading state thay đổi không được tự gây retry vô hạn.
5. Chốt repeat-one/repeat-all, next/prev ở đầu/cuối; không thay playlist source bằng catalog toàn hệ ngoài chủ đích.
6. Lắng nghe audio error/waiting/stalled/ended; hiển thị buffering/error, cho retry hoặc skip; xử lý play promise rejection. Không tự tăng lượt nghe khi audio không phát.

**Kết quả mong đợi:** queue/audio/UI nhất quán và API không bị spam bởi player effect.

**Nghiệm thu:**

- [x] Queue0/1/20/21 bài; shuffle on/off; append; repeat; next/prev đều đúng.
- [x] Offline hoặc empty page không tạo request loop.
- [x] Đổi playlist trong lúc fetch cũ đang chạy không trộn queue.
- [x] Audio URL lỗi có UI thông báo và hành động phục hồi.

**Bàn giao:** player state logic, unit tests và browser smoke notes.

<a id="t11"></a>

### T11 — Listening events đúng và bền vững

**Vị trí:** `UI/app/features/player/hook/useActivityLogger.ts`, `PlayerContext.tsx`, `Server/src/controllers/user_activity.controller.js`, activity model/migration và interaction scoring.

**Cách làm:**

1. Chốt event dictionary v1: một listening session có UUID, user xác định từ auth, songId, source snapshot, duration, actual listened time và exit reason. Đề xuất trước mắt chỉ gửi finalized session; nếu thêm progress event cần contract riêng, không cộng cả snapshot lẫn delta.
2. Flush snapshot bài cũ trước khi khởi tạo source/session bài mới. Repeat tạo session mới; pause/resume không tạo session mới. Time nghe không tăng khi paused/buffering và seek không được tính thành thời gian đã nghe.
3. Validate finite numbers, nonnegative/range hợp lý, enum và song existence/publication tại server. Không nhận userId/createdAt tùy ý từ client; timestamp server và duration canonical khi có.
4. Thay RAM buffer ACK-sớm bằng transaction lưu durable trước response. Dùng eventId/sessionId định danh finalized event, trả201 khi ghi mới và200 cho retry trùng hợp lệ. Cùng key khác payload bị409; DB fail không được trả success.
5. **Lưu ý schema hiện tại:** UserActivities đang partition theo created_at. Không thêm UNIQUE(event_id) đơn giản rồi giả định MySQL chấp nhận. Nếu giữ partition, tạo bảng receipt không partition với unique `(user_id,event_id)`, digest payload và kết quả; receipt + activity + cập nhật aggregate cùng transaction. Nếu chuyển activity sang unpartitioned ở T04 thì có thể unique trực tiếp. Xem [quy tắc partition và unique keys của MySQL 8.0](https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations-partitioning-keys-unique-keys.html).
6. Khi retry, frontend giữ nguyên eventId/payload; bounded retries. `sendBeacon` chỉ là best effort, kiểm tra boolean và không coi “queued” là DB ACK. Không cam kết giữ mọi event khi đóng tab/offline nếu chưa làm persistent client outbox.
7. Chọn một nguồn tăng lượt nghe: server tính từ accepted, deduped event. Bỏ double counting từ endpoint tăng view riêng và activity pipeline. Rule v1 đề xuất để dễ kiểm chứng: qualified listen ≥20 giây nghe thực tế; bài ngắn hơn ngưỡng được xử lý theo rule riêng có tài liệu, không tự đoán.

**Kết quả mong đợi:** event được server xác nhận đã tồn tại bền vững; retry không tăng count lần nữa; source/session phản ánh đúng hành vi.

**Nghiệm thu:**

- [x] Cùng event gửi2 lần chỉ tạo một activity/qualified listen.
- [x] A từ search → B từ recommendation không làm source của A đổi.
- [x] Repeat tạo session mới; seek cuối bài không được tính như nghe toàn bài.
- [x] Invalid event bị loại riêng; DB down trả lỗi; restart API không làm mất event đã ACK.
- [x] Network/tab-close best-effort limitation được ghi rõ, không quảng cáo exactly-once delivery.

**Bàn giao:** event contract, migration/receipt model, ingestion service và dedupe/retry tests. **Giá trị CV:** idempotency và data integrity.

<a id="t12"></a>

### T12 — Hợp nhất HTTP client, refresh và cache theo user

**Vị trí:** `UI/app/lib/http.ts`, `utils/refreshToken.ts`, auth API clients, `features/like/context/LikeContext.tsx`, user/admin providers.

**Cách làm:**

1. Chọn một transport dùng cho API authenticated, dùng cùng API base và error contract T05. Di chuyển các raw Axios/fetch có refresh riêng về client này; giữ beacon adapter riêng nhưng cùng URL/auth policy.
2. Refresh single-flight theo auth scope, không dùng chung queue user/admin. Request refresh không tự refresh chính nó; request đã retry vẫn401 thì kết thúc và cập nhật auth state.
3. Khi request đợi refresh được replay, giữ đúng method/body và retry marker. Upload/non-idempotent mutation cần cơ chế T08/T11, không tự retry mọi POST vì lỗi mạng.
4. Dùng server-state cache hiện có theo key chứa userId hoặc session identity. Login/logout/user switch phải clear hoặc invalidate private cache, playlist và favorite states.
5. Favorites library tải đủ pages thay vì cố định20 bài. Phân biệt favorite status của một bài với danh sách page1; không ghi đè toàn cache bằng một trang kết quả.
6. Giữ optimistic like nhưng rollback theo mutation/user hiện tại; có toast lỗi. Response cũ của userA không được cập nhật cache của userB sau account switch.

**Kết quả mong đợi:** hết session không gây request storm; account switch không làm lộ/trộn state; thư viện không mất các bài sau trang1.

**Nghiệm thu:**

- [x] Nhiều401 đồng thời chỉ tạo một refresh cho mỗi scope.
- [x] Refresh fail đưa UI về trạng thái hết phiên, không loop.
- [x] UserA logout → userB login không thấy like/playlist cache của A.
- [x] Library >20 bài có pagination/load more và thao tác like chính xác.

**Bàn giao:** một HTTP client chính, cache policy và tests refresh/account switch.

<a id="t13"></a>

### T13 — Dọn code và khôi phục type/lint/build gates

**Vị trí:** `UI/next.config.ts:4–5`, `UI/app/context/MusicDataContext.tsx:3`, `features/mix/mixService.ts:1`, `UI/eslint.config.mjs`, dead services/components được chỉ ra trong audit, backend song/recommendation services.

**Cách làm:**

1. Kiểm tra usages bằng tìm kiếm imports/exports trước khi xóa module. Hai module gây lỗi tsc hiện có dấu hiệu không được dùng; nếu thật sự dead thì xóa, nếu còn cần thì sửa contract/import thật.
2. Loại JSX/commented implementations cũ, API wrappers trùng và file rỗng. Đưa Python/notebooks không thuộc serving v1 sang khu vực experiments có README, giữ nguồn và attribution cần thiết.
3. Tạo types cho API response, Track, Artist, Playlist và error; dùng `unknown` + narrowing ở catch/boundary. Không thay any bằng ép kiểu `as` hàng loạt để im compiler.
4. Sửa hook dependencies theo hành vi: ổn định callbacks hoặc đổi cách quản lý state; không thêm dependency cơ học nếu tạo loop. Có tests cho effects player/auth trước khi sửa.
5. Tách các use case đã có nhiều trách nhiệm nhưng giữ modular monolith. Giữ controller parse/call/respond; đưa policy, storage và scoring vào module test được; chưa cần chuyển toàn backend sang TypeScript trong v1.
6. Bỏ `ignoreBuildErrors`; đồng bộ lint config với framework đã nâng ở T03. Thêm `typecheck` script và yêu cầu lint không có errors; warnings còn lại phải có lý do/issue, không disable toàn bộ rule.
7. Chạy typecheck → lint → tests → production build; xử lý cả build-time data fetching/env/font issues bằng cấu hình tái lập, không dùng secret production để build PR.

**Kết quả mong đợi:** build thành công phản ánh code đạt kiểm tra, không phải cấu hình đang che lỗi.

**Nghiệm thu:**

- [x] Typecheck0 errors; lint0 errors; warnings đã xử lý hoặc được giải thích cụ thể.
- [x] Không import file không tồn tại; không còn build-ignore/type-ignore đại trà.
- [x] Production build pass từ install sạch; behavior tests T01–T12 vẫn pass.

Bằng chứng nghiệm thu: [verification/T13.md](verification/T13.md); 24 cảnh báo ảnh được theo dõi tại [QUALITY_GATES_VI.md](QUALITY_GATES_VI.md).

**Bàn giao:** code được dọn, types, npm scripts và quality gate results.

<a id="t14"></a>

### T14 — Recommendation đúng nghiệp vụ và không tính toán nặng trong request

**Vị trí:** `Server/src/services/recommendation/`, `src/controllers/recommendation.controller.js:17`, recommendation routes, song similarity model/migrations.

**Cách làm:**

1. Chọn Node hybrid làm engine phục vụ v1. Tài liệu hóa input/output: eligible songs, positive/negative signals, seeds, scores, reasons và algorithm version. Các nghiên cứu Python không được hiển thị như service live.
2. Sửa seed selection: không mặc định coi mọi session ngắn/skipped là positive. Dùng rule qualified listen T11, favorite/rating và cap đóng góp lặp; ghi weights/config vào một chỗ có version.
3. Lọc eligibility trước top-K và trước trả explanation. Cold-start dùng trending public bounded; khi không có bài hợp lệ trảempty, không nới điều kiện approved.
4. Batch metadata/relations thay N findByPk; batch neighbors cho nhiều seeds. Lưu top-K hàng xóm mỗi bài, ví dụ K=50 làm cấu hình thử nghiệm, thay vì persist mọi cặp hai chiều. Tie-break theo songId để kết quả tái lập.
5. Serving chỉ đọc snapshot đã tính; không fallback bằng dựng TF-IDF/behavior matrix toàn DB trong request. Với scope v1, có thể chạy rebuild bằng CLI/admin maintenance có giới hạn catalog, thay vì buộc triển khai worker ngay. Tắt HTTP rebuild đồng bộ dài hoặc trả lỗi rõ khi feature maintenance không hỗ trợ online.
6. Rebuild có run/version: ghi snapshot mới, kiểm tra số lượng/điểm hợp lệ rồi chuyển active version nguyên tử; lỗi giữa chừng tiếp tục phục vụ version cũ. Không cho hai rebuild publish lẫn nhau. Đặt giới hạn catalog/tài nguyên rõ vì lưu top-K không tự làm chi phí tính all-pairs biến mất.
7. Đo query count và EXPLAIN với dataset test. Chỉ thêm composite index phù hợp query thật; so trước/sau. Ghi cả latency cold/warm, số bài và số interaction. Cache Redis chưa phải yêu cầu.

**Kết quả mong đợi:** gợi ý đúng policy, có lý do phản ánh thuật toán, serving có chi phí bị giới hạn và không phụ thuộc request debug/rebuild toàn hệ.

**Nghiệm thu:**

- [x] Cold-start, user chỉ có short skips, catalog rỗng và song bịẩn đều có kết quả hợp lệ.
- [x] Không trả duplicate song; limit có hiệu lực; eligibility không bị fallback phá vỡ.
- [x] Request phục vụ không đọc toàn bảng activity hoặc tính mọi cặp.
- [x] Rebuild fail giữ snapshot cũ; hai run không tạo dữ liệu nhiều version trộn lẫn.
- [x] Có query/latency report thật; không ghi phần trăm cải thiện trước khi đo.

Bằng chứng nghiệm thu: [verification/T14.md](verification/T14.md); contract và vận hành tại [RECOMMENDATION_ENGINE_VI.md](RECOMMENDATION_ENGINE_VI.md).

**Bàn giao:** engine contract/config, batch queries/top-K snapshot, rebuild script và benchmark kỹ thuật. **Giá trị CV:** recommendation explainability và performance engineering.

<a id="t15"></a>

### T15 — Sửa benchmark và đánh giá recommendation đúng nghĩa

**Vị trí:** `Benchmark/benchmark.js:83–135`, `db/recommendation_demo_*`, `AI_Services/scripts/evaluate.py`, `AI_Services/scripts/retrain_pipeline.py`.

**Cách làm:**

1. Giữ kiểm tra genre hiện có nhưng đổi tên thành synthetic genre-consistency smoke test. Không gọi mean Precision là MAP hoặc dùng explanation do engine tạo làm ground truth độc lập.
2. Viết evaluator cho **engine v1 thực sự được phục vụ**. Input gồm raw timestamped events hoặc synthetic fixture có timestamp, catalog version, config và seed. Tách evaluator khỏi việc khởi động HTTP server/model globals.
3. Chia train/validation/test theo thời gian trước khi tạo behavioral features, popularity và tuning weights. Dùng global cutoff cho v1 để tránh tương tác tương lai của user khác rò vào train; chỉ dùng metadata có sẵn tại cutoff khi cần đánh giá nghiêm túc.
4. Định nghĩa relevant item từ held-out qualified listens/favorites/rating theo business rule. Tách warm-user cohort và cold-start cohort; quy định loại trừ seen items phù hợp discover mode. Khi cohort không có held-out relevant item, ghi rõ exclude/zero policy và số lượng.
5. So ít nhất Popularity, Content-only và Hybrid trên cùng candidate eligibility, cohort và K. Tính Recall@K, NDCG@K và catalog coverage; viết fixture rất nhỏ để tính tay kiểm tra metric. Nếu dùng MAP thì phải tính Average Precision theo rank trước khi mean.
6. Lưu metrics JSON/CSV + config + data hash + seed + lệnh chạy. Không chỉ lưu PNG. Ghi label synthetic/real và hạn chế cỡ mẫu; không buộc kết quả Hybrid phải thắng để coi task thành công.
7. Python evaluator chỉ sửa nếu tiếp tục giữ như experiment có thể chạy: khởi tạo model rõ, compare songId thay dict, split trước retrain; nếu chưa hoàn thiện thì đánh dấu incomplete và không dùng số liệu đó trong showcase v1.

**Kết quả mong đợi:** có phép đo đúng và tái lập, hoặc minh bạch rằng dữ liệu chỉ hỗ trợ smoke test; không còn claim sai phương pháp.

**Nghiệm thu:**

- [x] Metric fixture thủ công có kết quả trùng evaluator.
- [x] Không training/tuning bằng test partition; evaluator fail rõ khi input không hợp lệ.
- [x] Baselines cùng điều kiện; chạy lại cùng config cho cùng kết quả ranking/metric.
- [x] Báo cáo nêu cỡ mẫu/cohort và dữ liệu tổng hợp nếu có; không suy từ offline score thành retention uplift.

Bằng chứng nghiệm thu: [verification/T15.md](verification/T15.md); protocol, kết quả synthetic và lệnh tái lập tại [evaluation/README.md](evaluation/README.md).

**Bàn giao:** evaluation script/tests và `docs/evaluation/README.md` (**tạo mới**). **Giá trị CV:** thực nghiệm có baseline và trung thực về giới hạn.

<a id="t16"></a>

### T16 — Hoàn thiện luồng trang, deep links và UI states

**Vị trí:** DetailSong/DetailView, Home/Following, FeaturedPlaylists, SearchBar/SearchResultsList, LibraryTable, profile/upload/admin pages và Next route files.

**Cách làm:**

1. Tạo routes entity theo ID, ví dụ `/songs/[id]` và `/playlists/[id]`; trang detail fetch entity theo URL, không phụ thuộc currentTrack của player. Link cũ redirect rõ nếu cần.
2. Chuẩn UI states: idle/loading/success/empty/error/unauthorized. Tái dùng skeleton recommendation đã có; không hiển thị “chưa có bài” khi request đang tải hoặc thất bại.
3. Search giữ debounce nhưng thêm AbortController/request sequence; query mới không bị response cũ ghi đè. Có clear, retry và điều hướng kết quả bằng bàn phím.
4. Mutation có trạng thái submitting/disabled, tránh double click; optimistic like rollback có toast. Form hiển thị lỗi theo field từ API contract, giữ dữ liệu người dùng đã nhập khi server lỗi.
5. Thêm route error boundary và not-found states; phân biệt resource không có quyền xem với lỗi mạng theo contract. Không retry vô hạn tại global error UI.
6. Bỏ AI Match98%,999K likes và lời hứa AI lyrics nếu chưa có dữ liệu thật. Hiện explanation thật; score chỉ hiển thị với ý nghĩa đúng, không ghi xác suất thích khi chưa calibrated.
7. Ẩn menu/tab/chức năng chưa làm hoặc hoàn thiện trong scope: Following, Daily Mix, comment, forgot password, report. Không để nút có vẻ hoạt động nhưng chỉ im lặng.

**Kết quả mong đợi:** reviewer mở link trực tiếp hoặc gặp lỗi mạng vẫn hiểu trạng thái và tiếp tục được; demo không có dữ liệu/tính năng giả.

**Nghiệm thu:**

- [x] Link song/playlist mở tab mới đúng entity, kể cả chưa từng phát nhạc.
- [x] Tìm A rồi B khi A response chậm vẫn hiển thị B.
- [x] Loading/error/empty/session-expired phân biệt được trên các màn chính.
- [x] Mỗi control trong demo path có hành vi rõ; lỗi server không xóa form vô cớ.

Bằng chứng nghiệm thu: [verification/T16.md](verification/T16.md); routes và hướng dẫn kiểm tra tại [PAGE_FLOWS_VI.md](PAGE_FLOWS_VI.md).

**Bàn giao:** routes/states/components và browser test evidence.

<a id="t17"></a>

### T17 — Responsive và accessibility dùng được

**Vị trí:** Sidebar/Header CSS modules, `UI/app/styles/globals.css`, `Player.css`, Modal, SearchBar, các icon buttons và sliders.

**Cách làm:**

1. Sửa breakpoint trong CSS Modules thật hoặc dùng biến CSS chung; không kỳ vọng selector `.menu` global tác động tới class module đã hash. Chốt sidebar width, header offset và main margin cùng một nguồn.
2. Mobile có navigation và player gọn; bỏ các width/offset cố định gây chồng như player `100% - 280px` và content128%. Dành không gian cho fixed player để không che nội dung cuối trang.
3. Kiểm tra375/768/1440px, màn hình thấp và zoom200%; cover/text dài phải wrap/truncate có chủ đích, controls vẫn bấm được.
4. Dùng button cho action thay clickable div; icon-only controls có accessible name; sliders có label/value; trạng thái shuffle/repeat/like có aria-pressed khi phù hợp.
5. Modal có dialog semantics, focus vào nội dung, trap/restore focus, Esc; search có keyboard navigation và announcement phù hợp. Focus ring hiển thị rõ, không phụ thuộc màu đơn độc.
6. Bổ sung alt cho ảnh cần thiết và alt rỗng cho ảnh trang trí; kiểm tra contrast và keyboard flow bằng thao tác thật, không chỉ dựa vào công cụ tự động.

**Kết quả mong đợi:** demo dùng được trên mobile và bàn phím; player/sidebar không làm che hoặc vỡ trang.

**Nghiệm thu:**

- [x]375/768/1440px không overflow ngang ngoài thành phần cuộn chủ đích; ảnh evidence đủ3 kích thước.
- [x] Keyboard thực hiện tìm→phát→like→thêm playlist→đóng modal, không mắc focus trap sai.
- [x] Zoom200% không làm mất thao tác quan trọng; lỗi accessibility nghiêm trọng trên demo path đã xử lý.

Bằng chứng: [verification/T17.md](verification/T17.md), ghi rõ phạm vi demo và cách mô phỏng reflow 200%.

**Bàn giao:** CSS/components sửa và ảnh/checklist accessibility.

<a id="t18"></a>

### T18 — Đo và sửa frontend performance

**Vị trí:** `useAudioEngine.ts`, `PlayerContext.tsx`, list consumers, root layout/fonts/icons, ảnh cover.

**Cách làm:**

1. Đo baseline trên production build với dataset và điều kiện ghi rõ: mobile viewport, network profile, browser, máy và cache state. Lưu Lighthouse/Profiler/bundle report trước khi tối ưu.
2. Tách progress/timeupdate khỏi Queue/Actions context; callbacks ổn định. List chỉ subscribe dữ liệu cần dùng, không rerender vì currentTime đổi.
3. Rà ảnh: kích thước hiển thị phù hợp, width/height tránh layout shift, lazy loading ảnh ngoài viewport; nếu dùng Next Image thì giới hạn remote hosts và kiểm tra image optimization configuration.
4. Inventory Font Awesome CDN/react-icons/lucide và imports thực tế; chọn pipeline đủ dùng, bỏ tải trùng. Dynamic import chỉ cho module nặng ít dùng, không áp dụng vô cớ lên mọi component.
5. Chạy lại cùng quy trình vài lần, báo median/range và các thay đổi thực sự. Nếu chưa có field traffic thì gọi kết quả là lab measurement, không gọi là Core Web Vitals thực tế của người dùng.

**Kết quả mong đợi:** có ít nhất một tối ưu đo được và không phá hành vi player/UI; hoặc có baseline minh bạch chứng minh chưa cần tối ưu thêm.

**Nghiệm thu:**

- [x] Profiler cho thấy list không rerender chỉ do playback timeupdate.
- [x] Không có layout shift lớn do ảnh thiếu kích thước hoặc thao tác bị chặn trên demo path.
- [x] Báo cáo trước/sau ghi đủ điều kiện; không ghi con số % khi chưa đo tương đương.

Hoàn tất2026-11-08: Profiler trước/sau và production lab3 lượt, responsive/keyboard PASS. Production metrics là baseline hiện tại; không có baseline tải trang trước tối ưu, không claim % tăng tốc. Xem [verification/T18.md](verification/T18.md).

**Bàn giao:** `docs/performance/README.md` (**tạo mới**) và reports. **Giá trị CV:** performance dựa trên bằng chứng.

<a id="t19"></a>

### T19 — Hoàn thiện bộ regression, integration và E2E

**Vị trí:** `Server/tests/`, `UI/tests/`, `UI/e2e/` hoặc thư mục tương đương tạo ở T00; scripts hai package.

**Cách làm:**

1. Gom các regression đã viết trong T01–T18 thành nhóm rõ: authorization, publication, session, upload, playlist, listening events, player, recommendation và UI state.
2. Integration dùng MySQL thật trong môi trường test; reset bằng fixture strategy chỉ áp dụng cho DB test có guard. Mock external media provider ở integration; giữ một smoke storage thật riêng khi deploy.
3. E2E chạy toàn app test: register/login, search/play, favorite, create/add playlist, recommendation explanation, upload/approve và account switch.
4. Thêm negative/failure cases vào bộ kiểm tra bắt buộc: unauthorized, rejected song, expired session, network error, duplicate event, concurrent playlist add, audio failure.
5. Tránh fixed sleeps; chờ trạng thái/response/locator. Seed có deterministic IDs hoặc test tìm qua key ổn định. Test không phụ thuộc thứ tự chạy.
6. Báo cáo coverage để tìm vùng rủi ro chưa test, không đặt100% làm mục tiêu hình thức. Mọi lỗi P0/P1 đã audit cần có test tự động hoặc bước kiểm chứng thủ công rõ lý do.

**Kết quả mong đợi:** có bằng chứng hệ thống giữ đúng các business invariants và demo path, không chỉ “mở trang thấy chạy”.

**Nghiệm thu:**

- [x] Unit/integration/E2E pass từ môi trường sạch, có test permission và concurrency thật.
- [x] Một lần chạy không để process/timer/DB connection treo.
- [x] Không skip vô điều kiện các test quan trọng để CI xanh; flaky case được sửa hoặc chưa được đánh dấu hoàn tất.

Bằng chứng nghiệm thu2026-11-08: [verification/T19.md](verification/T19.md), [hướng dẫn chạy](TESTING_VI.md). Fresh DB/seed và7 stages PASS; clean clone/Compose toàn stack tiếp tục ở T20.

**Bàn giao:** suite, scripts và bảng test cases ở phần4 của tài liệu này được cập nhật kết quả.

<a id="t20"></a>

### T20 — Docker toàn stack, health, logs và shutdown

**Vị trí:** `docker-compose.yml`, `UI/Dockerfile`, `Server/Dockerfile`, `.dockerignore`, `Server/src/server.js`, DB config.

**Cách làm:**

1. Compose v1 gồm `db`, migration job, `api`, `web`. Không thêm Python/Redis/worker khi scope chưa dùng. DB có volume và healthcheck; API chỉ khởi động khi schema đúng.
2. Docker build dùng lockfile và npm ci; tách build/test dependencies khỏi runtime; non-root user; pin runtime version được kiểm tra. Không COPY env, zip, node_modules máy host hoặc temp uploads vào image.
3. Next build/runtime cấu hình rõ; browser `/api` cùng origin, proxy tới API private. Nếu rewrite được chốt ở build-time thì tạo image theo môi trường; nếu cần một image promote nhiều môi trường thì dùng proxy runtime phù hợp và ghi rõ.
4. Migration job phải có Sequelize CLI dù API runtime bỏ devDependencies. Có thể dùng build/migration stage riêng; không chạy migrations đồng thời ở mọi replica.
5. `/health/live` phản ánh process; `/health/ready` kiểm tra DB/schema/dependency bắt buộc với timeout. Không trả secret hoặc stack. App start chỉ listen sau điều kiện startup; readiness503 khi không phục vụ được.
6. Structured logs có requestId, route, status, duration; redact cookies/token/password. Graceful shutdown ngừng nhận request mới, chờ in-flight có timeout và đóng pool. Timer/buffer cũ đã bỏ ở T11 không được quay lại.
7. Local DB port nếu cần bind127.0.0.1; production không publish DB public. Giới hạn disk/temp/log retention; tài liệu backup và restore vào database khác để kiểm chứng.

**Kết quả mong đợi:** ứng dụng chạy bằng một quy trình tái lập và có trạng thái sức khỏe đáng tin cậy.

**Nghiệm thu:**

- [x] Clone sạch + env mẫu đã điền → Compose build/start → demo path hoạt động.
- [x] API/DB restart giữ dữ liệu; DB down làm readiness503, không trả trang khỏe giả.
- [x] Image không chứa secret/local artifacts; app không chạy root ngoài yêu cầu hệ thống cụ thể.
- [x] Restore backup vào DB riêng đọc được dữ liệu; không thử restore đè production.

Bằng chứng2026-11-08: [verification/T20.md](verification/T20.md), [OPERATIONS_VI.md](OPERATIONS_VI.md). Clone từ snapshot local của working tree hiện tại; chưa phải remote release commit.

**Bàn giao:** Docker/Compose, env guide, probes/logging và operations runbook.

<a id="t21"></a>

### T21 — CI và quy trình release có kiểm tra

Hoàn tất 2026-11-13 trong phạm vi CI/quy trình release: PR #2 red → green, đủ sáu job trên GitHub, bảo vệ main và environment release. Xem [báo cáo T21](verification/T21.md). Chưa merge/deploy hoặc publish release tag.

**Vị trí tạo mới:** `.github/workflows/ci.yml`, tài liệu release; scripts đã thêm ở các task trước.

**Cách làm:**

1. Khi push/PR, checkout source, setup runtime theo repo và cài bằng npm ci cho cả UI/Server. Dùng lockfile làm cache key.
2. UI job chạy typecheck/lint/unit/build. API job chạy lint/unit; integration job dựng MySQL test, migrate/seed rồi test. E2E job chạy stack test và lưu trace/screenshot khi fail.
3. Thêm dependency/secret scan. Triage có owner/lý do/expiry nếu chấp nhận rủi ro; không mặc định mọi finding phải được `--force` update hoặc bị ignore.
4. CI PR không nhận production secrets; external storage dùng mock/fixture. Migration/seed chỉ trỏ tới service DB test.
5. Release build image tag theo commit SHA; deploy staging/demo, chạy smoke, rồi mới publish release tag. Có thể deploy thủ công theo runbook ở v1; không bắt buộc tự động hóa production khi chưa cần.
6. Nếu repo hỗ trợ branch protection, đặt required checks trước merge. Có phương án quay về image/commit trước và xử lý schema tương thích; code rollback không tự rollback được mọi migration.

**Kết quả mong đợi:** lỗi type, test hoặc migration được phát hiện trước release; có thể chỉ cho reviewer pipeline chạy thật.

**Nghiệm thu:**

- [x] Một PR thử cố tình làm fail regression bị CI phát hiện; sửa lại pipeline xanh (PR #2, run 43439497735 → 43440318536).
- [x] Migrate DB rỗng chạy trong CI, không phụ thuộc DB máy cá nhân.
- [x] Logs/artifacts không chứa credentials; failure traces đủ để debug (artifact thật scan 0 findings; failure summary và trace helper theo phạm vi báo cáo T21).

**Bàn giao:** workflow và một run xanh trên remote; nếu chưa có quyền remote, trạng thái chưa VERIFIED và ghi blocker cụ thể.

<a id="t22"></a>

### T22 — Hoàn thiện bộ tài liệu nghiệp vụ để dùng cho BA

Hoàn tất 2026-11-13 trong phạm vi tài liệu as-built. Có 10 stories, 12 business rules, event/KPI và traceability tới tests/evidence; không thay runtime hoặc claim phần chưa triển khai. Xem [product docs](product/README.md) và [báo cáo T22](verification/T22.md).

**Vị trí tạo mới:** `docs/product/use-cases.md`, `permission-matrix.md`, `business-rules.md`, `event-dictionary.md`, `acceptance-criteria.md`, `traceability.md`.

**Cách làm:**

1. Tổng hợp rule đã chốt lúc triển khai, không viết một bộ đặc tả trái với code sau cùng. Ghi actors guest/user/admin/super_admin và mục tiêu của từng nhóm.
2. Vẽ flow nghe/khám phá nhạc và workflow upload→pending→approved/rejected; ghi ai có quyền chuyển trạng thái và điều gì xảy ra khi bài bị ẩn.
3. Viết user stories cho scope thật, ví dụ “người nghe muốn thêm bài đang phát vào playlist để nghe lại”; mỗi story có success/validation/permission/failure acceptance criteria.
4. Event dictionary ghi field, kiểu, nguồn server/client, khi phát sinh, dedupe key và retention. KPI qualified-listen/skip/favorite cần numerator, denominator, window và các trường hợp bị loại.
5. Traceability map requirement ID → API/use case → bảng/field → test IDs → màn demo. Lấy ít nhất một ví dụ xuyên hệ: pending song không public hoặc retry event không double count.
6. Thêm quyết định/tradeoff: vì sao modular monolith, vì sao Node engine, vì sao chưa cần Redis/Python serving. Ghi assumptions và limitations của dataset.

**Kết quả mong đợi:** có thể trình bày cách chuyển yêu cầu nghiệp vụ thành thiết kế và kiểm thử, không chỉ nói đã làm frontend/backend.

**Nghiệm thu:**

- [x] Role matrix khớp tests T01; publication flow khớp T02; event/KPI khớp T11/T15.
- [x] Mọi user story trong demo có acceptance criteria và đường dẫn test/evidence.
- [x] Tài liệu phân biệt requirement, assumption và phần chưa triển khai.

**Bàn giao:** bộ product docs ngắn gọn, ưu tiên chính xác hơn độ dài. **Giá trị CV:** BA traceability và business-rule modeling.

<a id="t23"></a>

### T23 — Deploy demo và kiểm tra vận hành thực tế

Tiến độ 2026-11-13: người dùng chọn **MySQL 8 local + HTTPS tunnel miễn phí** thay Render/Filess. Runtime/browser/Cloudinary thật, restart/DB outage/backup/restore/rollback đã PASS; đang chốt source candidate qua CI trước nghiệm thu cuối. Chỉ có uptime khi PC/Docker/tunnel chạy, không claim hosting 24/7. Xem [báo cáo T23](verification/T23.md) và [runbook](deployment/LOCAL_HTTPS_DEMO_VI.md).

**Vị trí:** env/deployment configuration, health probes, demo database và tài liệu runbook.

**Cách làm:**

1. Chọn một môi trường hosting phù hợp kiến trúc đã có và ngân sách; dùng HTTPS, env runtime và DB private. Không cần đổi cloud/platform chỉ để có thêm tên công nghệ trong CV.
2. Deploy release đã qua CI, chạy migrations một lần và synthetic demo seed. Không copy database cá nhân lên public demo.
3. Kiểm tra cookies, CORS/origin, proxy API, audio URLs và refresh trên domain thực bằng browser. Local pass chưa đủ để coi auth deployment đúng.
4. Tạo tài khoản demo listener; nếu cung cấp admin demo thì giới hạn trên dataset/môi trường demo riêng, không có quyền infrastructure hoặc reset tài khoản người dùng thật. Demo reset dữ liệu phải có quy trình rõ.
5. Chạy smoke theo ma trận phần4: một hành trình listener và một hành trình moderation; kiểm tra cold-start, lỗi media và session expiry. Ghi release SHA và thời điểm xác minh.
6. Kiểm tra restart, logs/requestId, readiness và backup; thử rollback code trong môi trường demo với schema tương thích. Nếu demo ngủ do hosting, ghi rõ thời gian khởi động và có video dự phòng.

**Kết quả mong đợi:** reviewer có URL dùng được và tác giả có thể tìm nguyên nhân khi demo gặp lỗi.

**Nghiệm thu:**

- [ ] HTTPS, login/refresh/logout và audio hoạt động trên domain thực, không gọi localhost.
- [ ] User không truy cập admin API; dữ liệu demo không chứa PII/secret thật.
- [ ] Link demo, release SHA, smoke results và runbook được lưu.

**Bàn giao:** live demo đã kiểm chứng; nếu chưa deploy thành công, không đánh dấu portfolio-v1 hoàn thành theo tiêu chí này.

<a id="t24"></a>

### T24 — README, showcase và nội dung đưa vào CV

**Vị trí:** root `README.md` (**tạo mới**), UI/AI READMEs, `docs/evaluation/`, `docs/performance/`, screenshots/video và project release.

**Cách làm:**

1. Viết README theo thứ tự: vấn đề/người dùng → demo → features đã ship → kiến trúc/ERD → stack/tradeoffs → setup → tests/CI → đánh giá/performance → deployment/limitations → đóng góp cá nhân.
2. Chạy lại setup guide trong checkout sạch hoặc môi trường khác. Mỗi biến env và bước migrate/seed phải có giải thích; sample credentials chỉ dành cho demo.
3. Tạo video3–5 phút: listener flow, recommendation explanation, admin moderation và một bằng chứng kỹ thuật như CI/query plan/test security. Thêm screenshots desktop/mobile tương ứng bản hiện tại.
4. Ghi rõ nền đồ án nhóm, phần mình bổ sung và phạm vi Python experiments. Thêm attribution/license media/dataset và license source phù hợp quyền sở hữu thực tế.
5. Mỗi con số trong README/CV liên kết tới report có dataset/config/hardware/command. Nếu evaluator chỉ dùng synthetic fixture, ghi rõ; nếu chưa có improvement thì trình bày kết quả baseline trung thực.
6. Chọn3–4 CV bullets từ bằng chứng thật: correctness/security, performance, recommendation và BA. Không điền placeholder bằng mục tiêu chưa đạt; không tuyên bố production traffic khi chỉ load test.

**Kết quả mong đợi:** reviewer hiểu dự án trong vài phút và có thể kiểm tra sâu khi muốn.

**Nghiệm thu:**

- [ ] README chạy được từ clone sạch; link demo/video/CI/docs không hỏng.
- [ ] Feature list khớp app; không có98%/999K giả hoặc metric sai tên.
- [ ] Đóng góp cá nhân và hạn chế được ghi rõ; CV bullets có evidence.

**Bàn giao:** README hoàn chỉnh, release assets và bản nháp CV bullets đã điền số liệu thực tế.

<a id="t25"></a>

### T25 — Nghiệm thu cuối và chốt portfolio-v1

**Vị trí tạo mới:** `docs/releases/portfolio-v1-checklist.md`, cập nhật trạng thái backlog này.

**Cách làm:**

1. Chạy toàn bộ checks trên đúng commit dự kiến release, từ môi trường sạch. Không lấy kết quả của commit cũ có trước các thay đổi cuối.
2. Đối chiếu tất cả issue audit với task/evidence: lỗi đã sửa, được loại khỏi scope vì tính năng đã gỡ, hoặc limitation không chặn demo có lý do. Không bỏ qua lỗi bảo mật bằng cách đổi tên thành limitation.
3. Thực hiện ma trận nghiệm thu phần4 và checklist phần6. Ghi PASS/FAIL, evidence link và người/ngày kiểm tra; chưa làm phải ghi NOT_RUN.
4. Kiểm tra UI demo, docs, API spec và seed cùng một release; không có docs mô tả tính năng chưa ship.
5. Tạo release/tag sau khi gates đạt; giữ backlog nâng cao X01–X03 riêng. Chốt bản portfolio để bắt đầu dùng trong CV thay vì tiếp tục thêm scope vô hạn.

**Kết quả mong đợi:** một mốc hoàn thành có thể chứng minh: ứng dụng chạy ổn trong scope, đã kiểm thử, có demo và tài liệu để phỏng vấn.

**Nghiệm thu:**

- [ ] T00–T24 VERIFIED, hoặc task thành phần được thay bằng giải pháp tương đương và có rationale/evidence đầy đủ.
- [ ] Không còn P0/P1 ảnh hưởng scope v1; checklist phát hành đạt.
- [ ] Không phải hoàn thành X01–X03 mới được đưa dự án vào CV.

**Bàn giao:** release portfolio-v1 + checklist có evidence + backlog đã cập nhật.

## 4. Ma trận nghiệm thu xuyên hệ thống

Các ID sau nên được đưa vào tên test hoặc tài liệu test để dễ truy vết. AT01–AT22 đã kiểm chứng ở [verification/T19.md](verification/T19.md); AT23 ở [verification/T20.md](verification/T20.md), theo phạm vi clone snapshot local; AT24 ở [verification/T21.md](verification/T21.md), theo commit ứng viên PR. AT25–AT26 chưa nghiệm thu.

| ID | Kịch bản kiểm tra | Kết quả phải đạt | Task chính | Kết quả hiện tại |
|---|---|---|---|---|
| AT01 | Admin thường reset password super_admin | Bị từ chối; password/session target không thay đổi ngoài policy | T01 | PASS |
| AT02 | UserA đọc recommendations hoặc sửa playlist userB | Không được truy cập; không trả dữ liệu cá nhân của B | T01, T09 | PASS |
| AT03 | Pending/hidden/rejected song qua search/detail/favorite/playlist/recommendation | Không xuất hiện/không trả audio URL public | T02 | PASS |
| AT04 | Catalog không có approved song | Empty state đúng, không fallback sang pending | T02, T14, T16 | PASS |
| AT05 | Migrate+seed database rỗng; chạy migrate lại | Schema đúng, không lỗi/trùng dữ liệu ngoài chủ đích | T04 | PASS |
| AT06 | Malformed JSON, ID âm, q object, limit cực lớn | Validation error đúng contract, không500 tùy tiện | T05 | PASS |
| AT07 | Username100 ký tự; hai login cùng giây | Login thành công, không token truncation/collision | T06 | PASS |
| AT08 | Refresh đồng thời, hết hạn, logout, reset password | Rotation/revocation đúng policy; không refresh loop | T06, T12 | PASS |
| AT09 | Origin không hợp lệ, vượt login/upload/event quota | Mutation không được thực hiện; quota429 + Retry-After | T07 | PASS |
| AT10 | Upload invalid, cloud fail, DB fail, client retry | Không file rác/asset mồ côi không theo dõi/bản ghi nửa chừng | T08 | PASS |
| AT11 | Hai request thêm bài vào playlist cùng lúc | Hai bài khác nhau được giữ, positions không trùng | T09 | PASS |
| AT12 | Queue0/1/20/21 bài, shuffle/repeat/next/prev | Queue/audio/UI đồng nhất, không crash | T10 | PASS |
| AT13 | Player API offline hoặc trả page rỗng | Không request storm; có trạng thái/retry hữu hạn | T10 | PASS |
| AT14 | Audio URL hỏng hoặc trình duyệt chặn play | Có thông báo/retry/skip, không tăng count sai | T10 | PASS |
| AT15 | Một finalized event gửi lặp, đổi source, repeat | Dedupe đúng, source đúng, repeat có session mới | T11 | PASS |
| AT16 | DB down/restart API trong luồng ghi event | Không ACK giả; event đã ACK không mất vì RAM buffer | T11 | PASS (fault injection + API restart) |
| AT17 | LogoutA/loginB; favorites trên20 bài | Không cache bleed; tải được đủ dữ liệu | T12 | PASS |
| AT18 | Cùng snapshot/config/seed chạy recommender/evaluator | Kết quả tái lập; không data leakage từ test | T14, T15 | PASS |
| AT19 | Rebuild lỗi giữa chừng | Serving tiếp tục dùng snapshot trước đã hợp lệ | T14 | PASS |
| AT20 | Mở link song/playlist ở tab mới; search race | Đúng entity; response cũ không ghi đè query mới | T16 | PASS |
| AT21 | Mobile375/768/1440, zoom200%, keyboard | Không mất controls/che nội dung; thao tác chính dùng được | T17 | PASS (reflow mô phỏng) |
| AT22 | Audio timeupdate trong Profiler | Lists không rerender chỉ vì progress đổi | T18 | PASS |
| AT23 | Clone sạch/Compose, DB down, restart/restore | Setup tái lập; readiness đúng; dữ liệu/backup dùng được | T20 | PASS (snapshot local T20) |
| AT24 | CI đúng release commit | Type/lint/unit/integration/E2E/build đạt | T19, T21 | PASS ứng viên PR a9cbd8b; chưa release/deploy |
| AT25 | Demo HTTPS listener + moderation flow | Hoạt động trên domain thật, không URL localhost | T23 | NOT_RUN |
| AT26 | README metric/features/contribution review | Có bằng chứng, scope thật, không claim giả | T22, T24 | NOT_RUN |


## 5. Checklist lệnh kiểm tra và quy tắc lưu bằng chứng

Các lệnh dưới áp dụng **sau khi đã thêm scripts tương ứng**. Hiện tại nhiều scripts chưa tồn tại; chạy chúng hôm nay không chứng minh dự án đã được sửa.

```powershell
# Tại thư mục UI
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e

# Tại thư mục Server — phải nạp config DATABASE TEST riêng
npm ci
npm run lint
npm run db:migrate -- --env test
npm run db:seed:test
npm test
npm run test:integration

# Tại root — sau khi hoàn thiện T20, với env demo đã cấu hình
docker compose config
docker compose up --build
```

Test scripts phải chọn explicit test env; không dựa vào thư mục hiện tại để suy đoán database. `db:seed:demo` không được mặc định chạy trên DB thật. E2E cần stack test đã khởi động hoặc runner tự dựng đúng stack; README phải nói rõ cách nào.

Mẫu nội dung cho `docs/verification/Txx.md`:

```text
Task: Txx
Status: TODO | IN_PROGRESS | IMPLEMENTED | VERIFIED
Commit/PR:
Môi trường: runtime, database test, browser nếu cần
File chính đã đổi:
Business rule đã chốt:
Các lệnh đã chạy:
Kết quả: PASS / FAIL / NOT_RUN
Test IDs: AT...
Evidence: report/log/ảnh đã loại bỏ dữ liệu nhạy cảm
Hạn chế còn lại và lý do:
```

Không đánh dấu PASS chỉ vì tool chạy xong; kiểm tra exit code và assertions. Không công bố password/token, SQL dump người dùng thật hoặc log chứa Authorization/Cookie trong evidence.

## 6. Cổng hoàn thành từng giai đoạn và checklist phát hành

### Gate A — Quyền và nền dữ liệu đúng: sau T00–T07

- [ ] Không còn lỗi leo quyền/object authorization đã audit.
- [ ] Publication policy và private playlist được kiểm thử.
- [ ] DB fresh setup đúng; auth session không còn lỗi lưu token/rotation đã biết.
- [ ] Config/secret/dependency có triage; validation và abuse controls hoạt động.

### Gate B — Core product ổn: sau T08–T13

- [ ] Upload/playlist không partial write/race chưa xử lý.
- [ ] Player không sai queue hoặc lặp request.
- [ ] Listening events durable sau ACK và retry không double count.
- [ ] Account switch không trộn private cache; type/lint/build không bị bypass.

### Gate C — Có điểm nhấn và UX hoàn chỉnh: sau T14–T18

- [ ] Node recommendation có explanation/fallback thật; request cost được giới hạn.
- [ ] Evaluation đúng tên/phương pháp và dữ liệu được mô tả trung thực.
- [ ] Detail routes, loading/error/empty, responsive và keyboard flow đã kiểm tra.
- [ ] Có performance baseline và ít nhất vấn đề rerender đã được xử lý/kiểm chứng.

### Gate D — Đủ đưa vào CV: sau T19–T25

- [ ] Các AT01–AT26 có kết quả và evidence; không có FAIL chưa xử lý ở scope v1.
- [ ] CI xanh trên đúng commit; Docker/setup từ clone sạch hoạt động.
- [ ] Live demo HTTPS đã kiểm chứng, có video dự phòng và tài khoản demo an toàn.
- [ ] README/ERD/OpenAPI/product docs khớp code; biết rõ đóng góp cá nhân.
- [ ] Không secret/PII thật, không fake counters/accuracy, không claim traffic chưa có.
- [ ] Có thể trình bày3 câu chuyện: một lỗi khó đã sửa, một tradeoff kiến trúc, một kết quả đo hoặc bài học từ evaluation.

**Đạt Gate D là mốc dừng hợp lý để đưa vào CV intern.** Không cần hoàn thành backlog nâng cao bên dưới để được coi là hoàn tất công việc vá v1. Mốc này thể hiện chất lượng trong scope demo/portfolio, không phải cam kết SLA hay chứng nhận bảo mật cho dịch vụ thương mại lớn.

## 7. Backlog nâng cao — chỉ làm sau portfolio-v1

<a id="x01"></a>

### X01 — Feedback và onboarding cho recommendation

**Khi làm:** muốn tăng chiều sâu sản phẩm sau khi T14/T15 đã có baseline.

**Cách làm:** thêm onboarding chọn genre/artist; lưu explicit “không muốn nghe”; filter/ranking phản ánh feedback; log impression có recommendation request/version để attribution; thêm API schema/tests và đánh giá lại cùng baseline. Tách score similarity khỏi xác suất thích.

**Kết quả mong đợi:** người dùng kiểm soát được gợi ý và có thể giải thích tác động của feedback.

**Nghiệm thu:** hide bài có hiệu lực; user mới nhận gợi ý theo sở thích; explanation đúng version; không suy đoán uplift nếu chưa có experiment.

<a id="x02"></a>

### X02 — Durable jobs và Daily Mix tự động

**Khi làm:** cần rebuild/generate mixes online hoặc có bằng chứng synchronous maintenance không đáp ứng yêu cầu.

**Cách làm:** durable queue+worker cho aggregate/rebuild/daily mix; job key `(user_id,mix_date,algorithm_version)`; bounded retries/backoff/dead-letter; admin job status; publish snapshot nguyên tử; cache có version/invalidation. Nếu chọn Redis/BullMQ, cấu hình persistence, shutdown và mất kết nối trước khi đưa vào demo.

**Kết quả mong đợi:** restart worker không mất accepted job và không tạo mix trùng; API phục vụ nhạc không bị rebuild chặn.

**Nghiệm thu:** kill/restart worker, duplicate job, DB/storage failure có test; UI có pending/success/error; ghi processing lag/job success bằng số đo thật.

<a id="x03"></a>

### X03 — Tích hợp Python recommendation thành service thật

**Khi làm:** có câu hỏi thực nghiệm mà engine Node không đáp ứng, hoặc muốn hướng sâu ML/backend; không làm chỉ để thêm TensorFlow vào stack.

**Cách làm:** contract user/song IDs thống nhất, real data loader từ MySQL event schema, train/serve versions, evaluation chống leakage, inference timeout/circuit fallback, startup readiness/model checks và dependency lock/runtime tương thích. Loại hardcoded liked songs và chọn một entrypoint được tài liệu hóa.

**Kết quả mong đợi:** web thực sự gọi service và fallback được khi service lỗi, có kết quả so với baseline Node.

**Nghiệm thu:** contract tests, live request trace, model failure fallback và reproducible evaluation. Nếu chưa đạt thì vẫn để mục này dưới experiments, không ghi production integration trong CV.

## 8. Cách trình bày kết quả sau khi hoàn tất

Chuẩn bị câu trả lời ngắn cho các câu hỏi sau bằng code/evidence của chính dự án:

1. **Lỗi khó nhất đã sửa?** Identity mismatch gây leo quyền; trình bày failing test, policy mới và integration test chặn regression.
2. **Xử lý request đồng thời thế nào?** Playlist row lock, refresh rotation và finalized-event dedupe; giải thích transaction boundary và trường hợp retry.
3. **Vì sao chọn kiến trúc này?** Modular monolith đủ scope, một database, Node engine vận hành được; background worker/Python chỉ thêm khi có nhu cầu rõ.
4. **Recommendation tốt tới đâu?** Đưa baseline, cohort, metric đúng và limitations; nói rõ nếu dữ liệu synthetic hoặc Hybrid chưa vượt baseline.
5. **Đóng góp BA là gì?** Business rules, permission matrix, event/KPI dictionary, acceptance criteria và traceability tới tests.
6. **Có thể vận hành không?** Trình diễn CI, fresh setup, health/readiness, log requestId và backup/rollback runbook.

CV nên mô tả kết quả đã đạt và cách kiểm chứng. Một project có scope nhỏ nhưng chạy đúng, có test, demo và giải thích được các quyết định là mục tiêu của kế hoạch này.
