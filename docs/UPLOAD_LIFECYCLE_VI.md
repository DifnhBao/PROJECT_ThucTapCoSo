# T08 — Upload và vòng đời media

## API và retry

POST `/api/songs`, `/api/songs/upload`, `/api/users/avatar` cần header
`Idempotency-Key`: 8–128 ký tự ASCII chữ/số/underscore/hyphen. Auth, role, quota,
key và profile (user upload song cần first_name/last_name) được kiểm tra trước
Multer ghi file. Metadata vẫn dùng validation T05, không tin ID/role trong body.

Mỗi key gắn với signed userId và digest của operation/scope, metadata đã parse,
slot cùng SHA-256 nội dung file. Database unique `(user_id,key_digest)`; khóa user
khi reserve/finalize để serial hóa cùng người dùng. Không giữ transaction qua
network upload. `upload_receipts` có processing/completed/failed và response DTO.

- Request đầu trả201 cho song,200 cho avatar. Response DTO+receipt+song/relations
  commit cùng transaction; không có hydrate query sau commit trong khối rollback.
- Cùng key+cùng payload sau commit trả200 và `Idempotency-Replayed:true`, không
  gọi provider hoặc tạo resource khác. Upload đang processing trả409; cùng key
  khác payload trả409 IDEMPOTENCY_CONFLICT.
- Failure có thể retry cùng key sau khi cleanup hoàn tất. Còn asset chưa dọn trả
  409 UPLOAD_CLEANUP_PENDING. Một key khác là một intent mới, có thể tạo bài khác.
- Nếu commit acknowledgement bị mất, đọc lại receipt trước khi compensation.
  Receipt completed trả snapshot đã commit. Nếu DB vẫn không đọc được thì503
  UPLOAD_STATE_UNKNOWN, giữ assets/descriptor để không xóa nhầm bài đã commit;
  client phải retry **cùng key**, không tự tạo key mới.
- Snapshot replay là kết quả tại thời điểm commit; bài bị sửa/xóa sau đó không
  làm receipt biến thành create mới. Không expire/delete receipts tự động trong v1.

UI tạo key theo fingerprint FormData, giữ trong memory/sessionStorage qua lỗi
network hoặc đọc response, kể cả FormData được tạo lại; chỉ xóa sau response thành
công đã parse. Cùng file sau một success là intent mới. Memory map tối đa64 keys;
sessionStorage có thể bị browser tắt/xóa. Đóng tab/xóa storage có thể mất khả năng
khôi phục key; caller API cần tự giữ key nếu cần retry qua vòng đời browser đó.
Quota T07 vẫn tính các lần retry, không tạo đường bypass quota bằng key.

## File và cleanup

- Audio chỉ MP3/WAV/Ogg/Opus-in-Ogg; image chỉ PNG/JPEG. So chữ ký file qua
  file-type22.2.0 với MIME theo từng slot; filename client bị bỏ qua. Không nhận
  SVG, URL upload hoặc audio trong image slot. File10MiB và multipart limits T07.
  Magic-byte detection không phải antivirus hoặc giải mã toàn bộ media; provider
  vẫn có thể từ chối file hỏng và đi qua compensation.
- File tạm tên UUID, tạo exclusive trong Server/public/uploads/temp; đường dẫn
  cleanup bị chặn ngoài root. Test dùng subdirectory PID để cô lập workers.
- Multer storage theo dõi cả file đang ghi, đóng stream và cleanup khi request
  bị abort. Validation, file signature, cloud/DB error, replay và success đều dọn
  temp. Không tạo thư mục hoặc mở kết nối trong lúc import app.
- Nếu unlink thất bại, ghi JSONL tại Server/.runtime/upload-cleanup.jsonl, log
  event/requestId và retry bằng cleanup command. Journal batch rename để không
  làm mất append mới; batch bị gián đoạn vẫn được đọc lại. JSONL hỏng giữ nguyên
  để operator kiểm tra. Nếu cả ghi journal thất bại thì log cleanup_journal_failed:
  cần kiểm tra disk/quyền và scan temp root, không coi cleanup đã thành công.

## Asset ownership và recovery

Trước mỗi network upload, `media_assets` persist UUID, public_id do server cấp,
resource_type, delivery_type, format, receipt và state=planned. SDK upload
overwrite=false, timeout60s. Không suy public_id từ URL. Audio là video resource,
ảnh là image; mọi asset mới dùng **type=authenticated**.

Upload audio xong nhưng image/DB/relations fail: destroy tất cả planned IDs của
attempt (kể cả timeout có thể provider đã lưu), đúng resource_type/type, invalidate
cache. Destroy trảok/not found mới xác nhận; failure ghi cleanup_pending để retry.
Descriptor đã lưu trước network giúp recovery khi process chết/DB tạm unavailable.
Sau commit, asset owned có song_id/avatar_user_id, không được compensation xóa.

Avatar mới commit trước khi cũ được đưa vào cleanup queue. Khi upload/DB fail,
avatar cũ vẫn nguyên. Delete song/user dùng FK SET NULL để descriptor sống tiếp;
cleanup command phát hiện owned không còn owner và dọn. Không delete resource
chỉ vì client không đọc được response hoặc hydrate query lỗi sau commit.

Chạy bằng đúng runtime env, không truyền secret trên command line:

```text
cd Server
npm run uploads:cleanup
```

Mỗi lượt tối đa100 assets; chạy lại nếu còn pending. Không có daemon/scheduler mới
trong T08; cần đưa vào quy trình vận hành hoặc task worker sau. CLI trảnonzero nếu
còn cleanup_pending hoặc temp unlink vẫn lỗi. .runtime phải được giữ/persist khi
triển khai, không đóng gói vào Git/image; mất local runtime disk cần scan temp.

Nếu process chết để receipt processing: **dừng tất cả upload writers** trước khi
chạy `npm run uploads:cleanup -- --recover-stale-writers-stopped`. Chỉ phục hồi
processing cũ hơn30 phút và planned assets của receipt bị xóa; không tự reclaim
lease khi request có thể còn chạy. Sau recovery/cleanup, retry key cũ được phép.
Không gọi cờ này khi API vẫn nhận upload hoặc có task upload đang chạy.

## Phục vụ media và giới hạn

DTO mới chứa `/api/media/<asset UUID>`, không chứa URL signed/provider public_id.
API chỉ đọc owned assets. Song approved+visible được đọc công khai, kể cả khi có
cookie đăng nhập đã hết hạn; pending/rejected/hidden cần admin session hợp lệ.
Guest/user (kể cả uploader) không có admin scope bị404 ở private media. Avatar
chỉ được phục vụ khi còn là avatar hiện tại của user; không public asset đã thay.

Backend tạo private_download_url hết hạn120s, giữ URL trong server rồi stream
response, không redirect/expose chữ ký. Range dạng bytes=N-M/N- được forward;
status206/content-range đi qua nếu provider hỗ trợ, hoặc200 full file. Cache-Control
private,no-store. Mỗi request mới kiểm tra publication; request đã qua gate hoặc
bytes client đã tải không thể thu hồi ngược. Proxy tăng bandwidth/latency; Cloudinary
download API có chi phí cao hơn CDN. Quy mô lớn cần thiết kế delivery khác.

Asset lịch sử trong DB chỉ có URL, không có descriptor: **không tự đoán ID, xóa
hoặc chuyển type**. Các URL Cloudinary upload public đã phát hành trước T08 vẫn
có thể truy cập trực tiếp. Cần inventory xác minh quyền sở hữu, migrate/revoke và
kiểm tra cache trên tài khoản thật trước khi tuyên bố media legacy được bảo vệ.
T08 local chỉ kiểm chứng quản lý assets mới và quyền proxy; không thao tác cloud
thật, không migration media hiện hữu và không đảm bảo chống download/recording.

## Migration và triển khai

Migration20261027000100 tạo upload_receipts/media_assets + FK/index, không sửa
URL hoặc xóa media/song cũ. Deploy schema trước backend, frontend cùng phiên bản
để gửi Idempotency-Key. Không downgrade về uploader cũ và không drop bảng lifecycle.
DB test đã kiểm tra schema mới, transaction/retry/recovery; chưa áp lên deployed DB.

Nguồn:

- [file-type](https://github.com/sindresorhus/file-type): nhận diện dựa trên magic bytes.
- [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media):
  authenticated delivery và private_download_url hỗ trợ resource_type/type/expiry;
  API download không cache CDN, có chi phí bandwidth cao hơn.
- [Cloudinary destroy](https://cloudinary.com/documentation/image_upload_api_reference#destroy_method):
  public_id/resource_type/type và cache invalidation.
