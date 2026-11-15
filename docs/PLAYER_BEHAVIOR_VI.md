# Player queue và phục hồi audio

T10, ngày 27/10/2026. Player giữ một queue với source được truyền lúc chọn bài.
Playlist/search/recommendation mặc định là danh sách hữu hạn. Chỉ caller truyền
pagination rõ ràng mới cho phép nối catalog; hiện TrackSection dùng source radio,
page kế tiếp và pageSize20. Không tự thay playlist bằng catalog.

## Điều khiển

- Queue rỗng: không phát, không tải catalog, các nút điều hướng bị vô hiệu.
- Shuffle bật/tắt giữ nguyên ID và audio đang phát; append loại trùng ID, giữ bài
  hiện tại và chỉ xáo các bài mới khi đang shuffle.
- Next đi tới bài kế; cuối queue tải trang kế nếu được phép. Không còn bài và
  repeat-off/repeat-one thì dừng. Next thủ công vẫn chuyển bài trong repeat-one.
- Repeat luân phiên tắt → một bài → tất cả → tắt. Khi audio thực sự kết thúc,
  một bài phát lại bài đó; tất cả quay đầu sau khi phân trang đã kết thúc.
- Previous khi vị trí >3 giây đưa về đầu bài; nếu ≤3 giây chuyển bài trước.
  Ở bài đầu, repeat-all quay cuối, các chế độ khác bắt đầu lại bài đầu.
- URL lỗi hoặc play bị trình duyệt từ chối: thông báo, Thử lại và Bỏ qua.
  Bỏ qua ở cuối queue vẫn tuân theo repeat/phân trang, không tìm catalog khác.

## Phân trang và lỗi mạng

QueuePager có generation, AbortController và một request đang chạy. Đổi queue
vô hiệu request cũ kể cả transport bỏ qua abort. Trang rỗng, toàn ID trùng hoặc
đã đủ total kết thúc phân trang. Cursor chỉ tăng sau response hợp lệ.

Prefetch chỉ khi chuyển bài và còn ≤2 bài; queue rỗng/hữu hạn không prefetch.
Một lần tải có tối đa2 attempts, cách150ms; mỗi attempt timeout10 giây.
Không tự retry lỗi4xx. Sau thất bại, auto-fetch bị khóa đến khi người dùng nhấn
Thử tải tiếp hoặc chọn queue mới. Không dùng loading-state effect để lặp request.
Danh sách catalog có guard riêng: lỗi tải danh sách cần nút Thử tải danh sách,
scroll không tạo retry liên tục; lần đầu luôn page1, mỗi trang chỉ một flight.

## Audio và lưu trạng thái

Mỗi lần load tạo audio element mới, tháo listeners và dừng element cũ. Event/play
promise cũ không được sửa state của bài mới. `playing` xác nhận phát; `waiting`
và `stalled` hiển thị buffering, tạm ngừng đồng hồ nghe. `error` dừng đồng hồ.
Audio chưa từng phát không được phát sinh ended hợp lệ hoặc tăng view.

Lưu player_state_v3 mỗi5 giây và pagehide theo best effort: queue tối đa1000 bài
quanh bài hiện tại, index gốc, vị trí, source, shuffle, repeat và pagination.
Validate dữ liệu trước restore. T12 bổ sung owner và chờ auth được xác định; chỉ
restore đúng owner, xóa queue khi đổi account/logout. Không restore v2 hoặc v3
thiếu owner trên ứng dụng vì không biết thuộc ai, dù parser cũ vẫn đọc được v2.
Reload khôi phục **tạm dừng**, seek sau metadata; người dùng chủ động nhấn phát.
Thứ tự shuffle được dựng lại khi reload, không cam kết giữ lịch sử shuffle cũ.
Storage lỗi không được ngắt playback. Không lưu trạng thái lên server.

Các quyết định audio dựa trên [HTMLMediaElement.play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)
và việc cleanup/loại response cũ theo [React useEffect](https://react.dev/reference/react/useEffect).

## Phạm vi kế tiếp

T11 đã bổ sung finalized session/UUID, actual listening, ACK sau commit và dedupe,
đồng thời bỏ đường tăng view riêng; xem [LISTENING_EVENTS_VI.md](LISTENING_EVENTS_VI.md).
Không có persistent outbox: sendBeacon queued không chứng minh DB đã ghi.
Media legacy/public URL của T08 chưa được migration bởi thay đổi player.

Kiểm chứng và cách chạy: [verification/T10.md](verification/T10.md).
