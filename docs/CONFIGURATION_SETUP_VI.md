# Cấu hình và dữ liệu local sau T03

Docker toàn stack sau T20: xem [OPERATIONS_VI.md](OPERATIONS_VI.md). Phần dưới vẫn mô tả cấu hình chạy trực tiếp trên host.

Node 22.15+ là runtime cho tests và ứng dụng. Trong `Server/` và `UI/`, chạy
`npm ci` từ lockfile; không dùng `audit fix --force` để ép downgrade framework.

## Biến môi trường

| File mẫu | Copy thành | Thời điểm sử dụng |
|---|---|---|
| Root `.env.example` | Root `.env` | Docker Compose database, runtime |
| `Server/.env.example` | `Server/.env` | Express runtime và Sequelize CLI |
| `UI/.env.example` | `UI/.env.local` | Next rewrite config, build-time |
| `Server/.env.test.example` | Biến shell cho integration | MySQL test riêng, không fallback DB dev |

Điền giá trị thật ở máy local/provider; các placeholder `replace-with-*` không
phải credential dùng được. Hai JWT secrets phải khác nhau và dài ít nhất 32 ký
tự, sinh ngẫu nhiên bằng crypto. Không đưa secret vào prompt, source hoặc evidence.
Backend load env từ đúng `Server/.env` trước khi import routes/models; thiếu hoặc
sai cấu hình thì fail trước authenticate/listen, thông báo chỉ nêu tên biến.

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` bắt buộc cho runtime và
migrations. Production từ chối DB user root. `WEB_ORIGINS` là danh sách origin
HTTPS chính xác ở production, ngăn cách bằng dấu phẩy; development cho localhost.

## Browser cùng origin

Browser luôn gọi `/api`. Next rewrite `/api/:path*` tới
`${API_INTERNAL_URL}/api/:path*`; biến này chỉ ở phía server, không có tiền tố
`NEXT_PUBLIC_`. Ví dụ local: `http://127.0.0.1:5000`; container có thể dùng
`http://api:5000`. Production bắt buộc cấu hình rõ ràng, không fallback localhost.
Sau khi đổi upstream phải build lại Next. Nếu có reverse proxy riêng, cấu hình
upstream tương đương và giữ `/api` cùng origin ngoài browser.

`npm run dev` trong Server dùng Node watch tích hợp. UI dùng `npm run dev`;
production dùng `npm run build` rồi `npm start`. Build kiểm tra TypeScript thật,
không còn `ignoreBuildErrors`. Topology/cookie/CORS/CSRF đầy đủ nghiệm thu ở T07/T20.

## Database và tài khoản

Compose không còn import dump cá nhân. Init hook `db/10-app-permissions.sh` chỉ
chạy khi volume DB rỗng, giới hạn MYSQL_USER ở SELECT/INSERT/UPDATE/DELETE trong
database ứng dụng. Không xóa volume đang dùng để buộc hook chạy lại.

DB cũ cần quản trị viên kiểm tra `SHOW GRANTS` và cấp/revoke quyền có phối hợp.
DDL migrations dùng account migrator riêng, không dùng app user hoặc đưa root
credential vào runtime. Script `db:migrate` yêu cầu MIGRATION_DB_USER/PASS cho
development/production; chỉ ánh xạ trong process migration. DB_PORT dùng chung.
Xem [hướng dẫn database](DATABASE_SETUP_VI.md) cho migrations, seed và MySQL test.

## Dữ liệu được giữ ngoài deliverable

Các SQL dumps có user/refresh-token data, ZIP source và MP3 tạm đã được sao lưu
SHA-256 trước khi gỡ bản ở deliverable. Manifest ở
`docs/verification/evidence/T03/artifact-manifest.json`; bản giữ tại
`.local-backups/t03/artifacts/` (gitignored, không đưa vào image). Bản snapshot
trước sửa của source khác cũng ở `.local-backups/t03/scan-tree/`.

Đây là bản sao lưu cục bộ trên cùng máy, không phải backup chống mất ổ đĩa.
Không public thư mục backup. Hai SQL demo dùng email reserved domains được giữ
làm nguồn tham khảo, chưa chạy; seed chính có guard nằm ở Server/database/seed.cjs.

## Tiện ích và secret scanning

`UI/hash.js` nhận `HASH_PASSWORD` từ môi trường, không hardcode. Benchmark nhận
`BENCHMARK_TOKEN_USER_<id>` và `BENCHMARK_API_ORIGIN`, gọi `/recommendations/me`;
JWT từng user phải tương ứng chính user đó. Phương pháp metrics vẫn chờ T15.

Quét lại bằng official Gitleaks, không scan thư mục env/backup bị ignore:

```powershell
python scripts/scan-secrets.py --gitleaks <path-to-gitleaks.exe> --history
```

Script stage tracked files + untracked non-ignored files, quét toàn lịch sử Git
với `--all` nếu có `--history`; không copy .env ignored. Raw reports nằm trong
backup ignored; evidence chỉ lưu loại finding/file/dòng/commit. Findings trong
history phải được triage; xóa source mới không thu hồi credential cũ.
