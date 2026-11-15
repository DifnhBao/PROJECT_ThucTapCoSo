# Event dictionary và định nghĩa KPI

Nguồn contract: [validation](../../Server/src/validation/contracts.js), [ingest service](../../Server/src/services/user_activity.service.js), [client measurement](../../UI/app/features/player/listeningSession.ts), [T11](../LISTENING_EVENTS_VI.md). Các KPI dưới đây là định nghĩa phân tích, **chưa có dashboard/reporting job triển khai**.

## Listening finalized v1 — sự kiện bền hiện có

Client tạo event khi kết thúc/đổi bài/dừng/pagehide, chỉ nếu audio từng playing. Pause/resume giữ UUID, repeat sau ended dùng UUID mới. Client gửi `POST /api/activity` dưới user scope. Event không phải mỗi tick progress.

| Field | Kiểu / đơn vị | Nguồn và ý nghĩa |
|---|---|---|
| event_version | literal integer 1 | Client; phiên bản contract |
| session_id | UUID, chuẩn hóa lowercase | Client; khóa session, được server dùng làm event_id |
| song_id | integer dương | Client chọn bài; server kiểm tra bài public khi ghi mới |
| source | search / playlist / recommendation / radio | Snapshot client khi bắt đầu; enum radio không chứng minh đã có tính năng radio riêng |
| exit_reason | ended / skipped / tab_closed | Client finalize; skipped cũng có thể do đổi bài/dừng, không tự chứng minh người dùng không thích |
| song_duration | number 0–86400, giây | Client gửi; server ưu tiên duration DB nếu biết, không tin duration client để cấp qualified |
| total_listened_time | number 0–86400, giây | Client tích lũy tiến trình media có chặn bởi đồng hồ đơn điệu; có thể >duration khi nghe lặp đoạn |
| max_position_reached | number 0–86400, giây; default 0 | Không vượt duration client; DB duration cho phép sai số 1s rồi clamp. Không thay thế actual listened time |
| play_pause_count | integer 0–32767; default 0 | Bộ đếm client tăng khi bắt đầu/resume playing và khi user pause; không phải chỉ số lần pause thuần |
| seek_count | integer 0–32767; default 0 | Client đếm seeked, không cấp thời gian nghe từ khoảng tua |
| user_id | integer | Server lấy từ principal; client không được gửi để chọn actor |
| event_id / payload_digest | UUID / SHA256 hex | Server chuẩn hóa session_id và hash payload đã validate/default; không phải hash bằng chứng âm thanh |
| song_duration đã lưu / qualified | number / boolean | Server dùng canonical duration và quy tắc BR08 |
| id / created_at | BIGINT / datetime | Server/DB tạo sau ingest; API trả activity_id dạng string. created_at là thời gian nhận, không phải thời gian phát thực tế |

Khóa dedupe là `(user_id,event_id)`. Lần đầu commit thành công → 201; retry giống → 200 duplicate=true; đổi payload → 409. Cùng UUID của user khác không cùng receipt. Không retry bằng body đã sửa. DB fail không trả queued success. Ghi activity và tăng `songs.view_count` cùng transaction.

Client thường thử tối đa 3 lần, giữ tối đa 20 pending events trong RAM. Pagehide beacon/keepalive không chứng minh DB ACK. Có thể mất event khi offline/đóng tab/account đổi; không có exactly-once delivery. Unique receipt chống ghi/cộng lại khi retry còn giữ cùng identity/key.

**Retention thực tế:** chưa có TTL/purge job activity hoặc upload receipt. Legacy activity giữ event_version/event_id/digest NULL, qualified=false; không tự backfill/recount. Xóa user/song có thể cascade xóa activity. Dedupe chỉ tồn tại cùng receipt; chưa chốt retention nghiệp vụ để xóa chúng an toàn. Traceability không đặt ra thời hạn lưu mới.

## Các thay đổi trạng thái khác

| Dữ liệu | Nguồn / lúc phát sinh | Khóa và retention | Khả năng phân tích |
|---|---|---|---|
| favorites | User toggle like thành công | PK user_id + song_id; unlike xóa state | Chỉ biết trạng thái còn thích; không có journal toàn bộ like/unlike hoặc dedupe event |
| ratings | User ghi score 1–5 | Một state user_id + song_id; cập nhật score hiện tại | Không có lịch sử mọi lần đổi điểm |
| upload_receipts | Server reserve/finalize upload | Unique user_id + key_digest; chưa tự expire | Receipt phục hồi intent, không phải conversion/engagement event |
| songs.status/is_visible | Admin moderation/update | State hiện tại của song | Không có đầy đủ journal ai chuyển từng trạng thái/lý do/timestamp mỗi lần |

Không mô tả impression/search click/favorite event journal như dữ liệu đã tồn tại. Evaluator T15 nhận journal synthetic theo schema riêng; điều đó không đồng nghĩa runtime đã thu thập journal ấy.

## KPI và cửa sổ

Đặt W = `[startUTC,endUTC)`. Chỉ xét **receipt đã commit**, event_version=1, phân nhóm theo source/song nếu cần. Dùng created_at server nên late retry được tính ở cửa sổ ingest; không dùng window này để khẳng định thời điểm phát ngoài đời. Mẫu số 0 → null, không tự đổi thành 0%. Đây là cohort receipt, không phải toàn bộ lượt play vì guest/event mất không có mặt.

| Metric / trạng thái | Numerator | Denominator | Loại trừ / giới hạn |
|---|---|---|---|
| Qualified-listen count — tính được từ DB | Số receipt qualified=true trong W | 1 (count, không phải rate) | Loại legacy, chưa commit; retry không tạo thêm row |
| Qualified-listen rate — suy ra được | Receipt qualified=true trong W | Tất cả receipt v1 trong W | Bao gồm short/unknown duration ở mẫu số, chúng không qualified; không phải unique listeners |
| Skip-session rate — suy ra được | Receipt v1 có exit_reason=skipped trong W | Tất cả receipt v1 trong W | Không coi tab_closed là skipped; không suy skip=dislike; session vừa qualified vừa skipped vẫn có thể xuất hiện ở cả hai numerator |
| Active favorite stock — snapshot hiện tại | Số row favorites join song public tại thời điểm t | 1 (count) | Không phải số lượt bấm like, không khôi phục stock lịch sử chỉ từ bảng hiện tại |
| Favorite conversion — ĐỀ XUẤT, chưa đo được đúng | Cặp user/song có event favorite-on hợp lệ mới trong W | Cặp user/song có play hợp lệ trong W, theo cohort đã chốt | Cần journal favorite-on/off + event ID và play/exposure policy; loại retries, auth failures, dữ liệu test. Chưa có journal nên không xuất tỷ lệ hoặc giả số liệu |

Ví dụ tính tay: 4 receipts v1 trong W, 2 qualified và 1 skipped → qualified rate 2/4=50%, skip rate 1/4=25%. Gửi lại một receipt 8 lần không đổi count. Đây là ví dụ định nghĩa, không phải kết quả production.

`view_count` là aggregate tích lũy, không thay cho KPI theo W hoặc unique users; legacy counter không được recount bởi T11. Recall@K/NDCG@K/coverage thuộc [T15 offline evaluation](../evaluation/README.md): global cutoff, eligible unseen positives, macro mean trên users có relevant items; không gọi score recommendation là xác suất, không đổi tên Precision thành MAP và không suy business conversion từ synthetic metrics.
