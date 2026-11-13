# Listening events v1 — T11

Ngày 27/10/2026. API chỉ nhận **finalized session**, không nhận progress snapshot
để cộng dồn. Một lần phát lại/repeat tạo UUID mới; pause/resume giữ UUID cũ.
Người dùng lấy từ phiên đăng nhập đã xác thực, timestamp do server tạo.

## Contract

`POST /api/activity`, cookie user hoặc bearer user, JSON, Origin theo T07.
Không chấp nhận user_id/created_at hoặc trường ngoài schema. Một request là một
sự kiện; request lỗi không ngăn sự kiện hợp lệ kế tiếp.

| Trường | Ý nghĩa / giới hạn |
|---|---|
| event_version | Bắt buộc 1 |
| session_id | UUID; đồng thời là event ID của finalized session, server chuẩn hóa chữ thường |
| song_id | Integer dương, bài approved và visible khi ghi lần đầu |
| source | search / playlist / recommendation / radio, snapshot lúc bắt đầu |
| exit_reason | ended / skipped / tab_closed |
| song_duration | Giây, finite 0–86400; dùng duration trong DB nếu >0 |
| total_listened_time | Giây nghe thực tế, finite 0–86400; không phải vị trí phát |
| max_position_reached | Giây, finite 0–86400, ≤duration client; canonical duration cho phép sai số tối đa1 giây rồi clamp |
| play_pause_count / seek_count | Integer 0–32767, mặc định0 |

Duration chưa biết trong DB dùng duration client để lưu dữ liệu tương tác; không
đủ điều kiện tăng lượt nghe. Có thể nghe lặp đoạn qua seek nên total nghe không
bắt buộc ≤duration; vẫn có trần86400 giây/session. API không chứng minh người
dùng thực sự nghe bằng tai; số đo client có validation, không phải hệ chống gian lận.

Response nằm trong envelope T05 `{data,meta}`:

```json
{
  "event_id": "10000000-0000-4000-8000-000000000001",
  "activity_id": "42",
  "qualified": true,
  "song_duration": 180,
  "duplicate": false
}
```

- 201: activity + qualified increment đã COMMIT.
- 200: cùng authenticated user + UUID + normalized payload đã được ghi;
  cùng activity_id, duplicate=true, không cộng lại.
- 409 ACTIVITY_CONFLICT: cùng user/UUID nhưng payload khác. Digest SHA256 bao gồm
  tất cả trường đã validate/default, cả duration client; không sửa payload để retry.
- 400: schema lỗi; 404: bài không public/không tồn tại; 422: vị trí vượt canonical
  duration; 500: lỗi DB/transaction/commit. Không trả queued success.

Nếu COMMIT thành công nhưng response mất hoặc báo lỗi, client giữ UUID/body cũ
và gửi lại để nhận receipt. Retry receipt vẫn được trả nếu bài sau đó bị ẩn;
ghi mới vẫn phải qua publication check. Auth luôn phải còn hợp lệ.

## Transaction, schema và lượt nghe

T04 đã bỏ partition của UserActivities. Migration
`20261027000200-listening-events.js` kiểm tra điều kiện này trước DDL, thêm
event_id, payload_digest, event_version, qualified và UNIQUE(user_id,event_id).
Activity row đóng vai trò receipt; không cần bảng receipt riêng. Legacy rows giữ
event_id/digest/version NULL, qualified=false, không backfill/recount/xóa lịch sử.
Migration hỗ trợ chạy tiếp nếu DDL dở dang, forward-only. Thử trên DB clone trước
khi áp dụng production theo hướng dẫn database; T11 chỉ đã chạy trên DB test.

Managed transaction khóa song khi kiểm tra publication, insert activity và tăng
view_count cùng transaction. Unique conflict được kiểm tra lại ngoài transaction
đã rollback, nên các request đồng thời dùng cùng UUID chỉ ghi/cộng một lần.
Sequelize chỉ resolve sau commit theo [tài liệu transaction chính thức](https://sequelize.org/docs/v6/other-topics/transactions/).
DB lỗi không có fallback RAM. Receipt tồn tại theo vòng đời activity; xóa user/song
cascade xóa activity, không cam kết chống replay sau khi receipt bị xóa thủ công.

**Quy tắc v1:** bài có canonical duration ≥20 giây và actual listened time ≥20
giây được cộng1 view khi finalized event mới được chấp nhận. Bài <20 giây hoặc
duration chưa biết không cộng view, vẫn lưu engagement. Không giảm ngưỡng riêng
cho bài ngắn. Retry không tăng thêm; repeat hợp lệ với UUID mới có thể cộng thêm.
Không tăng realtime giữa bài. POST /songs/:id/view được giữ như endpoint hết dùng:
public song trả410 VIEW_ENDPOINT_RETIRED, hidden/absent vẫn404, không mutation.

Interaction scoring giới hạn completion bonus bằng actual listen ratio, nên tua
đến cuối không nhận full completion. Base bonus của event v1 theo qualified đã
lưu; legacy dùng duration/listened threshold, không tự tăng view từ scoring.

## Player và delivery

ListeningSession snapshot bài/source trước khi đổi queue. Native playing bắt đầu
đếm; pause/waiting/stalled dừng. Dùng media progress bị giới hạn bởi performance.now
đơn điệu; seeking/seeked đặt lại mốc, không lấy currentTime làm total nghe. Đếm
bảo thủ theo native samples, có thể thiếu phần nhỏ giữa sample cuối và chuyển bài.
Metadata cập nhật duration; audio chưa từng playing không gửi event. Retry audio
cùng bài giữ session; ended rồi phát lại tạo session mới. Finalize lấy snapshot
bất biến và xóa session ID trước khi gửi, ngăn double flush.

ActivityDelivery serialize một lần, bình thường tối đa3 attempts, timeout5 giây/
attempt, backoff250ms rồi750ms cho network/5xx. Auth/schema/conflict/quota4xx không
tự retry. Chỉ receipt200/201 đúng event_id/activity_id mới coi là ACK. Không còn
gọi tăng view riêng. Giữ tối đa20 events đang gửi trong RAM; quá giới hạn hoặc hết
retry có thể mất event, không làm gián đoạn nghe nhạc. Không có persistent outbox.

Pagehide finalize một lần rồi thử sendBeacon cho các events còn chờ, kiểm tra
boolean; false/throw thì thử fetch keepalive một lần với cùng body. Beacon queued
không phải DB ACK, gửi trùng được server dedupe. Đóng tab, mất mạng, hết phiên,
browser kill hoặc queue đầy vẫn có thể mất sự kiện. **Không cam kết exactly-once
delivery.** T12 đã đưa activity vào transport chung: normal send có thể refresh401
một lần, giữ nguyên UUID/body; beacon/keepalive khi pagehide không khởi tạo refresh.
Đổi account bỏ session/pending event cũ, refresh cùng account giữ phiên nghe.
Xem [HTTP_ACCOUNT_CACHE_VI.md](HTTP_ACCOUNT_CACHE_VI.md). Không coi event chưa ACK
là đã tồn tại trong DB.

Kiểm chứng: [verification/T11.md](verification/T11.md).
