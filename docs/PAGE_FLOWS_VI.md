# Routes và trạng thái giao diện

- `/songs/[id]` tải bài theo URL, dùng được khi chưa có currentTrack. Nút phát chọn
  bài đó; like/rating thao tác đúng ID được mở. Player, search, catalog và library
  có link theo ID. `/DetailSong?track=ID` redirect sang route mới; thiếu ID về Home.
- `/playlists/[id]` tải playlist theo URL. Guest có thể mở playlist public theo
  policy backend; chỉ owner thấy thao tác xóa. Xóa có xác nhận/submitting, lỗi giữ
  nguyên màn hình và cho phép thao tác lại. `/Playlist` là danh sách/create.
- Loading, empty, lỗi mạng, hết phiên, forbidden và missing/non-public có thông báo
  khác nhau. Entity/profile/artist SWR không tự retry khi lỗi; nút retry là thao tác
  thủ công. Resource 404 không tiết lộ playlist private có tồn tại hay không.
- Search debounce 300 ms; hủy request và bỏ response cũ khi query đổi. Có clear,
  retry, ArrowDown/ArrowUp để chuyển focus, Enter mở link, Escape đóng kết quả.
- Form tạo playlist, song/admin, profile, login/register giữ input khi lưu lỗi;
  khóa submit khi đang gửi. Error contract được hiển thị bằng tên field và thông
  báo dễ đọc. Profile load ban đầu không ghi đè input đã được sửa.
- Following/Daily Mix/forgot password/comment/report và các control giả ở detail
  không được quảng bá như tính năng hoạt động. Following cũ redirect Home.
  Bỏ AI Match 98%, 999K likes và lời hứa lyrics AI. Recommendation giữ explanation
  thực và score xếp hạng hiện có, không coi score là xác suất thích.

Root/main error boundaries có nút thử lại thủ công; unknown route có not-found và
link Home. Responsive/accessibility tổng thể và tối ưu ảnh tiếp tục thuộc T17/T18.

Kiểm tra từ repo root:

```text
npm --prefix UI run check
npm --prefix UI run start -- --port 3016
```

Trong terminal khác: `npm --prefix UI run test:pages:browser`. Cần Playwright và
Edge cài sẵn; đặt PLAYWRIGHT_MODULE_PATH nếu runtime nằm ngoài UI/node_modules.
Có thể đổi server bằng T16_URL. Browser dùng routes Next thực cùng API fixture,
không dùng backend/Cloudinary thật. Evidence lưu ở docs/verification/evidence/T16.
Xem [báo cáo T16](verification/T16.md).
