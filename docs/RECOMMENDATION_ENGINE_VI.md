# Recommendation v1 — Node hybrid và snapshot

Engine phục vụ website nằm trong `Server/src/services/recommendation/`. Python tại
`experiments/` là nghiên cứu lưu trữ, không phải service live. T15 sẽ đánh giá
chất lượng ranking; T14 kiểm tra tính đúng nghiệp vụ và chi phí serving.

## Contract và tín hiệu

- Eligible song: `status=approved AND is_visible=true`. Cả seed lẫn candidate đều
  được kiểm tra bằng dữ liệu hiện tại khi đọc snapshot. Hydration kiểm tra lại
  candidate trước khi trả media. Source không hợp lệ trả 404.
- Config/version: `config.js`, `node-hybrid-v1`. Đổi semantics hoặc weights cần
  tăng version và rebuild. Snapshot lưu nguyên config của run.
- Positive listen: receipt T11 `event_version=1`, qualified và thời lượng/thời gian
  nghe ít nhất 20 giây. Mỗi user/song tối đa 3 lượt đóng góp, mỗi lượt +1.
  Legacy session hoặc short skip không được coi là positive.
- Favorite +5; rating từ 4 trở lên +2. Rating 1–2 veto seed và candidate;
  rating 3 trung lập. Không dùng hai dislike làm bằng chứng hai bài được cùng thích.
- Serving đọc tối đa 200 qualified activities mới nhất theo id, 200 favorites và
  200 ratings đầu theo song ID cho user hiện tại; chọn tối đa 20 seeds theo weight
  giảm dần, song ID tăng dần. Đây là giới hạn v1, không phải mô hình toàn bộ lịch sử.
  Veto được batch-check lại cho seeds/candidates ngoài cửa sổ ratings; trending
  cũng dùng NOT EXISTS low rating, tránh đưa lại bài bị dislike ngoài cửa sổ.
- Metadata dùng genre/mood/artist/keyword/lyrics/duration với weights
  0.25/0.20/0.15/0.10/0.25/0.05. Lyrics TF-IDF chỉ tính offline.
  Behavioral cosine dùng positive user-song matrix, shrinkage commonUsers/(commonUsers+5).
  Có behavioral dương: 0.6 metadata + 0.4 behavioral; nếu thiếu: metadata.
- Mỗi seed lưu tối đa 50 neighbors dương, theo score giảm dần và song ID tăng dần.
  Personal ranking cộng score × seed weight, gộp song ID, loại seeds đã biết và
  dislike trước limit. Similar endpoint không trả chính source.

Output giữ envelope API hiện tại: song DTO cùng score/reason. Similar có
`final_score`, `metadata_score`, `behavioral_score`; personal có `accumulated_score`,
`endorsed_by_count`. Score là điểm xếp hạng, không phải xác suất thích.
Reason lấy từ đặc trưng thực sự tính trong run; personal dẫn nguồn seed còn public.
Public serializer không đưa raw debug/matrix/detail ra ngoài.

## Serving và fallback

Request không tải toàn bảng activity, không dựng matrix, không tính TF-IDF/all-pairs.
Một SQL join active pointer → run → neighbors lấy batch cho nhiều seeds và lọc
publication cả hai đầu; hydrate songs/relations theo batch, không N findByPk.
Không có snapshot hoặc không có neighbors: similar trả rỗng; personal chuyển sang
trending công khai theo view_count DESC/song_id ASC, có limit và giữ veto.
Catalog không có eligible song trả rỗng, không nới điều kiện approved.

Debug chỉ admin/super_admin, chỉ đọc cặp có trong active top-K và còn eligible;
không có cặp trả `SNAPSHOT_PAIR_NOT_FOUND` 404. Debug không còn tính realtime hoặc
cho xem cặp pending. POST rebuild vẫn kiểm tra auth/origin/schema nhưng trả
`OFFLINE_REBUILD_REQUIRED` 409, không chạy maintenance online.

## Migration và vận hành offline

1. Áp dụng migrations bằng `npm run db:migrate -- --env development` hoặc
   `production` với cấu hình migration account theo DATABASE_SETUP_VI.md.
2. Chạy `npm run recommendations:rebuild` trong Server với database được cấu hình
   chủ động. Không chạy lệnh này trên production chỉ để thử nghiệm.
3. CLI in run/version, số bài, số edges/interactions và thời gian; exit khác 0 khi lỗi.
   Sau triển khai migration, chưa rebuild thì similar rỗng và personal dùng trending.

Ba bảng mới: `recommendation_runs`, `recommendation_state`,
`recommendation_neighbors`. Legacy `song_similarities` được giữ để bảo toàn dữ liệu,
không được tự động coi là snapshot v1. Migration forward-only, có thể chạy lại sau
gián đoạn; không yêu cầu ALTER/drop bảng similarities cũ.

Rebuild giữ khóa singleton row bằng `FOR UPDATE NOWAIT` trong transaction InnoDB;
run đồng thời khác connection/process bị từ chối (`REBUILD_BUSY`). Metadata,
signals, edges và active pointer nằm trong cùng transaction REPEATABLE READ.
Kiểm tra scores/count trước khi đổi pointer; commit công bố toàn bộ, rollback hoặc
mất connection giữ snapshot cũ. Reader resolve pointer và neighbors trong cùng
statement, không trộn versions. Không giữ active pointer trong process cache.

Giới hạn cứng mỗi rebuild: 500 eligible songs, 20.000 rows mỗi nguồn signals,
10.000 ký tự lyrics/bài; vượt giới hạn fail rõ `RECOMMENDATION_CAPACITY`, không
publish một catalog cắt cụt. Tối đa 25.000 directed edges/run, bulk insert 200 rows/lần.
Việc tính vẫn O(N²), chưa phải giải pháp cho catalog lớn. Đây là maintenance có
giới hạn, chưa có worker/Redis. Giữ lịch sử snapshots, chưa tự prune; vận hành cần
theo dõi dung lượng và lên lịch rebuild sau thay đổi catalog/signals/config.
Bài mới chưa có neighbors có thể xuất hiện trong trending, cần rebuild để có similar.

## Kiểm chứng

[Báo cáo T14](verification/T14.md) dẫn log MySQL và JSON query/latency/EXPLAIN.
Số đo dùng fixture synthetic local; first-call không đồng nghĩa database cold cache.
Không suy ra % cải thiện hoặc chất lượng gợi ý từ latency hay genre consistency.
