# Database lifecycle — T04

## Nguồn schema

`Server/migrations/*.js` là nguồn khởi tạo và nâng cấp schema. Không dùng
`sequelize.sync({alter:true})`, SQL dump hoặc các SQL recommendation tham khảo
để khởi tạo. Baseline bất biến nằm ở `Server/database/schema-v1.cjs`; mọi đổi
schema tiếp theo cần migration mới. Migrations cũ được chuyển **nguyên nội dung**
vào `Server/migrations/legacy/`, không được CLI chạy tự động hoặc rollback.
Genres/song_genres chỉ do baseline tạo, giải quyết ownership trùng của lịch sử.

Hai migrations baseline của T04 (các migration T06/T08/T11/T14 tiếp tục nằm ở Server/migrations; readiness T20 yêu cầu đủ danh sách hiện tại):

1. `20261016000100-schema-baseline.js`: DB rỗng tạo đầy đủ 13 bảng và indexes.
   DB không rỗng chỉ được nhận diện nếu có đủ 8 tên migration legacy trong
   SequelizeMeta và đủ bảng/cột dự kiến. DB dump không metadata hoặc lịch sử dở
   dang bị từ chối, không tự đánh dấu đã migrate hoặc xóa dữ liệu.
2. `20261016000200-reconcile-legacy-schema.js`: preflight orphan activities,
   duplicate activity IDs, playlist NULL name và timestamp NULL; có lỗi thì yêu cầu sửa thủ công.
   Bỏ partition bằng REMOVE PARTITIONING (giữ rows), đổi PK thành id, thêm FK
   activity → users/songs ON DELETE CASCADE, bắt buộc tên playlist/timestamps, bổ sung indexes
   còn thiếu. Kiểm tra trước mỗi DDL để chạy tiếp được nếu một bước đã hoàn tất.

UserActivities không còn partition trong scope v1. Model và DB cùng PK id; T11
thêm eventId/digest/unique receipt bằng migration20261027000200-listening-events.js;
xem [LISTENING_EVENTS_VI.md](LISTENING_EVENTS_VI.md). Baseline T04 không bị sửa.
JSON metadata defaults []/{} của Sequelize là default tại ứng dụng; DB cho phép
NULL, không dùng JSON DEFAULT literal không tương thích MySQL 8 cũ. Similarity
pairs cố ý không có FK theo thiết kế engine hiện tại; unique pair có thật.
Refresh token schema vẫn tương thích code hiện tại, raw token/length/rotation
được xử lý trong T06; không tuyên bố migration T04 đã bảo mật session.

## Database đang có dữ liệu

Backup ngoài máy và thử restore trước khi nâng cấp. Đối chiếu SequelizeMeta,
SHOW CREATE TABLE, orphan/duplicate và dung lượng trống trên **bản clone** trước.
MySQL DDL implicit commit, REMOVE PARTITIONING có thể rebuild/khóa bảng; đặt lịch
bảo trì phù hợp. Không chạy rollback legacy vì migration genres cũ drop bảng do
init sở hữu. Không sửa applied migration, không xóa volume để ép init chạy lại.
Forward migrations từ chối down; rollback vận hành dùng backup đã kiểm chứng.

Luồng tự nhận diện chỉ hỗ trợ lịch sử đủ 8 migrations và schema tương ứng.
Các DB đã sửa tay/dump thiếu metadata cần đối chiếu và kế hoạch migration riêng;
không suy luận an toàn chỉ từ tên DB. Baseline mới thất bại giữa chừng trên DB
rỗng cần kiểm tra nguyên nhân và tạo lại **DB disposable** hoặc phục hồi backup;
không replay mù lên dữ liệu thật.

## Chạy migration cho local demo

Tạo database rỗng tunetrek_demo. Runtime account chỉ cần DML; dùng account
migrator riêng có DDL trong đúng database. Compose T20 cấp DML cho app user và provision migrator riêng qua init hook trên volume mới. Volume cũ cần admin DB provision migrator sau khi backup, không xóa volume để chạy lại init. Không đặt root vào API.

Trong Server/.env điền DB_HOST/PORT/NAME/USER/PASS runtime như ví dụ. Cung cấp
MIGRATION_DB_USER/PASS qua môi trường process riêng rồi chạy trong Server:

```powershell
npm run db:migrate -- --env development
```

Script yêu cầu env explicit. Test dùng TEST_DB_* riêng; development/production
không fallback sang runtime account để chạy DDL. Production runtime vẫn từ chối
root. Không truyền secret trực tiếp trong command line/lịch sử shell.

Seed demo chỉ được chạy với NODE_ENV=development, DB tên tunetrek_demo hoặc
tunetrek_demo_<suffix>, host local/db, DEMO_SEED_ALLOWED=yes và DEMO_SEED_PASSWORD
12–72 ký tự thực tế (không placeholder). Sau đó trong Server:

```powershell
npm run db:seed:demo
```

Seed chỉ chấp nhận database không có application data, chạy trong transaction.
Lần hai từ chối rõ ràng, không tạo trùng hoặc ghi đè user. Tài khoản: demo_userA,
demo_userB, demo_admin, demo_super_admin, demo_cold_start. Password lấy từ env,
lưu bcrypt. Dùng email example.test; 28 bài, 25 approved+visible, 1 pending,
1 rejected, 1 hidden; 4 genres, 3 artists, 2 public/private playlists, favorites,
ratings, activity và similarity fixtures. Cold-start không có tương tác.
Audio URL dùng reserved domain example.test: **không cung cấp nhạc phát được**.
Media demo thực tế thuộc T08/T23, không lấy MP3/dữ liệu người dùng từ dump cũ.

## MySQL test riêng

Copy Server/.env.test.example thành file ignored `.local-backups/t04/test.env`
(tạo thư mục nếu chưa có). Điền mật khẩu test ngẫu nhiên, JWT test khác nhau và
TEST_DB_RESET_ALLOWED=yes. Tên đề xuất tunetrek_test_t04, port3307. Đừng dùng
database chung hoặc chứa dữ liệu cần giữ. Không dùng `.env` runtime cho tests.

Tại root:

```powershell
docker compose --env-file .local-backups/t04/test.env -f docker-compose.test.yml -p tunetrek-t04-test up -d --wait --wait-timeout 180
```

Container MySQL 8 chỉ bind127.0.0.1 và không mount application volume/dump.
Tại Server, kiểm chứng các scripts riêng trên DB test rỗng nếu cần:

```powershell
node --env-file=../.local-backups/t04/test.env scripts/db-migrate.cjs --env test
node --env-file=../.local-backups/t04/test.env scripts/db-seed.cjs test
node --env-file=../.local-backups/t04/test.env tests/helpers/run-integration.cjs
```

Suite integration **drop toàn bộ bảng trong DB test đã chọn**, rồi chạy fresh
migrate/seed, lần hai, schema/model/index/FK, HTTP T01/T02 và fixture nâng cấp
partition legacy. Runner và reset helper đều kiểm tra NODE_ENV=test, đủ
TEST_DB_*, allowlist tên/host, cờ reset trước khi kết nối. Không gọi Cloudinary.
Account test có DDL trong DB test; account runtime production chỉ DML.

Dừng container sau kiểm tra (không đụng volume ứng dụng):

```powershell
docker compose --env-file .local-backups/t04/test.env -f docker-compose.test.yml -p tunetrek-t04-test stop
```

Container test giữ trạng thái cuối suite (fixture kiểm tra từ chối DB không
metadata), không phải môi trường demo. Muốn tái tạo từ đầu có thể xóa đúng
container thuộc project test rồi up lại; không xóa volume music_web_db/mysql_data.
Các SQL recommendation trong db/ chỉ là tham khảo legacy, không có guard mới;
không chạy chúng trên DB thật hoặc thay thế seed chính.
