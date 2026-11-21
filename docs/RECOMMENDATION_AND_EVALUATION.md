# Recommendation và đánh giá

Engine phục vụ là [Node](../Server/src/services/recommendation/), [config](../Server/src/services/recommendation/config.js) `node-hybrid-v1`. Score là điểm xếp hạng, không phải xác suất thích.

## Hybrid ranking

Chỉ approved + visible được làm seed/candidate. Favorite +5, rating ≥4 +2, qualified listen +1 (receipt v1, ít nhất 20 giây, tối đa 3 lượt/user/song). Rating ≤2 veto seed/candidate; rating 3 trung lập. Serving giới hạn 200 signals mỗi nguồn, 20 seeds; veto được kiểm tra lại ngoài cửa sổ rating.

Metadata genre/mood/artist/keyword/lyrics/duration có weights 0.25/0.20/0.15/0.10/0.25/0.05; lyrics TF-IDF tính offline. Behavioral cosine dùng positive user-song matrix, shrinkage `commonUsers/(commonUsers+5)`. Behavioral dương: `0.6 × metadata + 0.4 × behavioral`; thiếu behavioral dùng metadata.

Mỗi seed giữ tối đa 50 neighbors dương. Personal cộng score × seed weight, gộp song ID, bỏ seeds đã biết/dislike trước limit; tie-break song ID. Lý do lấy từ đặc trưng đã tính. Hydration kiểm tra publication hiện tại; nguồn không public trả 404. Không có snapshot/neighbors: similar rỗng, personal fallback trending public có veto; catalog rỗng vẫn trả rỗng.

## Atomic snapshot publication

[Builder](../Server/src/services/recommendation/snapshot.service.js) giữ singleton row lock `FOR UPDATE NOWAIT` trong transaction REPEATABLE READ, từ chối concurrent rebuild. Run/config, edges và active pointer commit cùng nhau sau validation; rollback giữ snapshot cũ. Reader resolve pointer + neighbors trong một statement, không cache pointer theo process.

Rebuild offline: `npm --prefix Server run recommendations:rebuild` sau migrations với DB được chọn rõ. HTTP rebuild trả `OFFLINE_REBUILD_REQUIRED`; serving không dựng matrix/all-pairs. Đổi semantics/weights phải tăng version và rebuild.

Giới hạn 500 eligible songs, 20.000 rows mỗi nguồn signals, lyrics 10.000 ký tự/bài, tối đa 25.000 directed edges/run. Vượt giới hạn fail thay vì publish catalog cắt cụt. Chi phí O(N²), chưa có scheduler/prune tự động hay giải pháp catalog lớn. Xem [Operations](OPERATIONS_AND_TESTING.md).

## Offline evaluation

[Benchmark](../Benchmark/) dùng chung lõi ranking thuần với serving, không cần DB/HTTP/Cloudinary/Python. Từ root sau khi cài Server dependencies:

```powershell
node Benchmark/generate-fixture.cjs
node Benchmark/evaluate.cjs --input Benchmark/fixtures/temporal-synthetic-v1.json --out docs/evaluation/results/synthetic-v1 --k 5
node Benchmark/benchmark.js --input Benchmark/fixtures/genre-smoke.json
```

Frozen training: chia raw events theo global cutoff trước TF-IDF, behavioral matrix, popularity. Fixture train đến 2026-01-10 UTC, validation đến 2026-01-20, test đến 2026-01-30. Catalog/metadata as-of train cutoff; không retrain/tune trên validation/test. Relevance từ held-out positives, lọc eligibility/seen/veto; user không có relevant item được đếm và loại khỏi macro mean.

So Popularity (qualified train receipts), Content-only, Hybrid trên cùng catalog/cohort/K. Recall@K = hits/relevant; NDCG dùng binary relevance, log2 discount/ideal DCG; coverage = distinct recommended songs/eligible catalog. Seen chỉ là positive profile giới hạn như serving, không phải mọi bài từng nghe. Genre smoke không đo MAP/serendipity hoặc chất lượng người dùng thật.

Kết quả synthetic đã lưu, test/all K=5 (khác fixture onboarding bên dưới):

| Model | Recall@5 | NDCG@5 | Coverage@5 |
|---|---:|---:|---:|
| Popularity | 0.3000 | 0.1292 | 0.3889 |
| Content-only | 0.8000 | 0.5047 | 0.7778 |
| Hybrid | 0.8000 | 0.5047 | 0.7778 |

Artifacts: [metrics](evaluation/results/synthetic-v1/metrics.json), [CSV](evaluation/results/synthetic-v1/metrics.csv), [rankings](evaluation/results/synthetic-v1/rankings.json), [manifest](evaluation/results/synthetic-v1/manifest.json). Fixture có 12 users, 18 eligible songs, mỗi split chấm 10 users. Hybrid chưa tốt hơn Content-only; cold test Recall/NDCG bằng 0. Không suy production uplift/retention từ synthetic.

## F3 — Cold-start onboarding

`GET /api/recommendations/me` trả mode `cold_start` khi không có positive seed và không có favorite/rating; có lịch sử nhưng không tạo được đề xuất thì dùng `trending`. UI chỉ mời onboarding ở cold-start chưa dismiss. Catalog starter phân trang 12 bài; chọn 3–10 bài rồi `POST /api/favorites/batch`. Server lấy user từ session, khóa shared các song theo ID, kiểm tra public toàn bộ trước ghi; upsert favorite trong một transaction làm retry idempotent. Nếu có bài bị ẩn/reject, trả `STARTER_SONG_UNAVAILABLE` và không lưu một phần.

Save thành công revalidate favorite và feed theo auth epoch; không trộn tài khoản và không rebuild online. Snapshot có neighbors phù hợp thì feed thành `personalized`, giải thích dựa trên favorite; thiếu snapshot/neighbors vẫn fallback trung thực. Dismiss theo user trong localStorage, không phải preference lưu ở server.

[Fixture deterministic F3](../Server/tests/api/recommendation-onboarding.test.cjs) chạy trong `npm --prefix Server test`: trước chọn bài, ranking `[7,8,9]` có Recall@3/NDCG@3 **0/0**; chọn ba favorite `[1,2,3]`, snapshot có sẵn đưa `[4,5,6]` lên đầu, đạt **1/1**. Gửi lại batch vẫn đúng 3 favorites. DB/snapshot được mock có kiểm soát, không phải đo uplift người dùng thật và không thay thế benchmark temporal K=5 hay MySQL E2E. [Component tests](../UI/tests/components/cold-start-onboarding.test.mjs) kiểm tra trạng thái và lỗi UI.

## Python research

Nguồn/notebooks/model/dataset legacy đã được đưa ra ngoài release tree trước lượt dọn này; [research status](../experiments/EVALUATION_STATUS.md) **INCOMPLETE**. Next/Express/Compose không gọi Python phục vụ. Chưa xác minh training, split/leakage, metrics hoặc quyền phân phối; không dùng scores/plots legacy làm kết quả website. Giữ attribution gốc, phục hồi archive chỉ khi có đợt nghiên cứu riêng.
