# Secret và artifact triage — T03

Ngày kiểm tra: 16/10/2026. Scanner: official Gitleaks v8.30.1 Windows x64,
tải từ release chính thức, đối chiếu SHA-256 với checksums của release trước khi chạy.

## Phạm vi và kết quả

| Phạm vi | Kết quả |
|---|---|
| Source trước sửa: tracked + untracked non-ignored files, archive depth 3 | 114 findings, đều rule JWT |
| Lịch sử Git, tất cả refs bằng `--log-opts=--all` | 187 findings, đều rule JWT |
| JWT duy nhất trong lịch sử | 39; payload exp đều trước ngày audit |
| JWT duy nhất trong tree trước sửa, gồm dump untracked | 71; payload exp đều trước ngày audit |
| Exp muộn nhất trong lịch sử | 18/06/2026 04:35:09 UTC |
| Exp muộn nhất trong tree trước sửa | 25/06/2026 00:29:48 UTC |
| Deliverable hiện tại sau sửa | 0 findings |

Evidence chỉ lưu rule/file/dòng/commit/fingerprint/description tại
`evidence/T03/secrets-*.json`; không lưu giá trị khớp hoặc nguyên dòng source.
Raw output đã redact nằm trong `.local-backups/`, không đưa vào Git/image.
Giới hạn: scanner chỉ xác nhận phạm vi rules đã chạy; không chứng minh không còn
mọi loại secret hoặc PII. `.env` thật ignored không bị copy vào staging và không
mặc nhiên được kết luận đã lộ.

## Kết luận theo nhóm finding

- JWT trong `Benchmark/benchmark.js`: bỏ literal, lấy token từng user từ env và
  dùng `/recommendations/me`, không đọc chéo user qua route ID đã gỡ ở T01.
- JWT trong `db/data.sql`, `db/init.sql`, `db/merged_data.sql`, root `init.sql`:
  các bản hiện tại được sao lưu rồi gỡ khỏi deliverable. Các literal lịch sử đều
  đã hết hạn theo exp; không tìm thấy provider key/JWT signing secret bằng các
  rules Gitleaks trong phạm vi đã quét. Không claim đã xác minh chữ ký của các token.
- Password literal trong `UI/hash.js` và Compose: bỏ hardcode; utility lấy
  `HASH_PASSWORD`, Compose nhận env. Placeholder trong env mẫu không chạy được
  cho tới khi người triển khai điền credential phù hợp.
- SQL dumps có dữ liệu user/contact/refresh tokens chưa được xác nhận synthetic:
  cách ly cả file, không copy row dữ liệu vào báo cáo. Hai seed demo giữ lại chỉ
  có email thuộc reserved domains theo rà hiện tại, chưa chạy; T04 thêm guard/seed mới.
- ZIP và MP3 tạm: kiểm kê ZIP (không có `.env` entry theo tên), scan với archive
  depth 3, backup có checksum rồi gỡ bản deliverable. `pyvenv.cfg` local cũng gỡ;
  virtual environments/cache đã được ignore và không đưa vào image.

## Bảo toàn và lịch sử Git

16 file/artifacts, tổng 79,102,768 bytes, được copy và xác nhận SHA-256 trùng trước
khi gỡ bản ở workspace deliverable. Manifest:
`evidence/T03/artifact-manifest.json`. Bản backup vẫn tại
`.local-backups/t03/artifacts/`; snapshot source trước sửa ở `.local-backups/t03/scan-tree/`.

Không thay đổi `.env` thật, không gọi provider để rotate/revoke khi chưa có
finding credential hiện còn hiệu lực được xác nhận. Không rewrite hoặc force-push
lịch sử Git trong lượt này. Các dumps/contact data trong lịch sử vẫn cần chủ dự
án rà phạm vi và phối hợp history cleanup trước khi public toàn repository; xóa
file ở working tree không xóa các commit cũ. Đây là việc còn lại trước công bố,
không được hiểu là lịch sử đã sạch chỉ vì current-tree scan trả 0.
