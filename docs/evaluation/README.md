# Đánh giá recommendation v1

T15 đánh giá **Node engine đang được phục vụ**, không dùng Python experimental
hoặc câu giải thích của engine làm ground truth. Hiện chỉ có dữ liệu **synthetic**;
các số dưới đây minh họa evaluator, chưa chứng minh chất lượng trên người dùng thật.

## Chạy và tái lập

Từ repo root, sau `npm ci` trong Server, với Node 22.15+:

```text
node Benchmark/generate-fixture.cjs
node Benchmark/evaluate.cjs --input Benchmark/fixtures/temporal-synthetic-v1.json --out docs/evaluation/results/synthetic-v1 --k 5
node Benchmark/benchmark.js --input Benchmark/fixtures/genre-smoke.json
npm --prefix Server test
```

Evaluator không cần database, HTTP, Cloudinary, `.env`, token hoặc model Python.
Lệnh tương đương từ Server: `npm run evaluate:recommendations -- --input <input>
--out <directory> --k 5`; paths tương đối theo cwd. K phải là số nguyên 1–50.
Input JSON tối đa 5 MiB, theo strict schema tại `Server/src/evaluation/input.js`.
Lỗi input/unknown flags trả exit code khác 0, không xuất kết quả đánh giá thành công.
Không có tùy chọn tune trên validation/test hoặc thay weights ngầm trong CLI.

Output:

- [metrics.json](results/synthetic-v1/metrics.json): metric, protocol, config,
  seed, catalog version, cỡ mẫu/split và training/model hashes.
- [metrics.csv](results/synthetic-v1/metrics.csv): bảng theo model/split/cohort.
- [rankings.json](results/synthetic-v1/rankings.json): per-user rankings, relevant
  IDs, số positives bị loại và metric để kiểm tra lại.
- [manifest.json](results/synthetic-v1/manifest.json): SHA256 input bytes/source
  modules, Node version, config và lệnh tái lập. Không có timestamp/run UUID ngẫu nhiên.

Chạy lại cùng input/config/code/runtime cho cùng rankings và artifacts. Seed 150015
điều khiển generator synthetic; engine dùng tie-break song ID, không random ranking.
Unit test chạy CLI hai lần, so byte cả JSON/CSV, và chặn import models/Sequelize/
dotenv để chứng minh không cần khởi động app hay đọc config database.

## Dữ liệu và chia thời gian

Schema gồm catalog snapshot, users, timestamped receipt/favorite/rating events,
provenance, seed, catalog_version và ba global cutoffs. Timestamp phải là UTC canonical
`YYYY-MM-DDTHH:mm:ss.sssZ`, ID unique và tham chiếu hợp lệ. Không nhận view_count
hiện tại hoặc trường config tùy ý trong dataset. Listen receipt phải tương thích
T11 và thời lượng catalog; không chuyển legacy sessions thành qualified một cách ngầm định.

Protocol **frozen training**, dùng cho cả validation và test:

- Train: timestamp ≤ 2026-01-10T00:00:00.000Z.
- Validation: train_end < timestamp ≤ 2026-01-20T00:00:00.000Z.
- Test: validation_end < timestamp ≤ 2026-01-30T00:00:00.000Z.

Chia trên raw events trước khi tính favorites/ratings hiện hành, behavioral matrix,
TF-IDF hoặc popularity. Global cutoff áp dụng cho **mọi user**, tránh dùng tương tác
tương lai của user khác. Không tuning hoặc retraining bằng validation/test; validation
ở đây là diagnostic riêng. Ranking giữ nguyên giữa hai cửa sổ vì profile cũng được
freeze tại train cutoff, không phải mô phỏng hệ thống cập nhật online.

Catalog phải ghi nhận as-of=train_end. Item có sẵn trước cutoff nhưng chỉ có metadata
tương lai bị từ chối vì không thể chứng minh historical features. Item mới sau cutoff
bị loại khỏi candidate set và corpus TF-IDF. Eligibility là approved + visible trong
snapshot train cố định; chưa mô phỏng các thay đổi publication ở test time.
Nếu đưa dữ liệu thật vào, phải cung cấp historical metadata/publication snapshot,
receipt đã deduplicate và event journal favorite/rating đầy đủ, không chỉ dump trạng
thái hiện tại. Trường `data_label=real` là khai báo nguồn, không tự chứng nhận provenance.

## Engine chung và ba baseline

`ranking.js` chứa buildEdges/metadata normalization/seed selection/personal ranking
thuần. Snapshot builder và service phục vụ T14 cùng gọi các hàm này. Evaluator dùng
chính các hàm đó và signals/config hiện tại; không copy một thuật toán Hybrid khác.
Metadata adapter và SQL hydration nằm ngoài lõi thuần. Test parity đối chiếu evaluator
với actual serving wrapper trên cùng snapshot/profile; MySQL regression bảo vệ publish,
rollback và concurrent rebuild sau refactor.

- **Popularity:** số qualified receipt trong train, tie-break ID; không dùng
  view_count tích lũy hiện tại. Đây cũng là fallback trending cho hai engine còn lại.
- **Content-only:** cùng metadata/lyrics corpus và top-K builder, matrix hành vi rỗng.
- **Hybrid:** metadata + positive behavioral matrix theo config `node-hybrid-v1`.

Mọi model dùng cùng eligible catalog, user cohort, negative/seen policy và K=5.
Không bắt buộc model điền đủ K nếu snapshot thiếu candidates; slots thiếu không phải hits.
Seed window giống serving: tối đa 200 qualified activities mới nhất theo ID, 200
favorites/ratings theo song ID, 20 seeds, repeat cap=3. Favorite/rating state lấy
sự kiện cuối theo timestamp rồi ID tại cutoff. Low rating veto được áp dụng cả ngoài
cửa sổ ratings như serving. “Seen” trong protocol này là positive weights của profile
giới hạn đó, **không phải toàn bộ lịch sử nghe**; short skips không tự thành positive.

Relevance là positive weights từ **held-out events riêng của mỗi split**: qualified
listen, favorite=true chưa bị gỡ trong cửa sổ, rating ≥4; rating ≤2 veto. Sau đó chỉ
giữ eligible, chưa seen và không bị train veto. Không đọc reason/genre để quyết định
relevance. `raw_heldout_positive` và `excluded_heldout_positive` cho biết số positives
bị lọc vì seen, không có ở cutoff hoặc veto.

Warm user có eligible positive seed còn dùng được tại train cutoff; cold user không
có seed đó, bao gồm user chỉ short skip. Cửa sổ không có relevant item được **exclude
khỏi macro mean** và được đếm, không ngầm ghi 0. Cohort không có user được chấm có
Recall/NDCG=null và coverage=0 nếu catalog còn bài. Catalog rỗng cho coverage=null.

## Công thức và fixture tính tay

Binary relevance, K vị trí đầu; không cho duplicate IDs:

- Recall@K = số hits / số relevant eligible unseen items.
- DCG@K = tổng `hit(rank)/log2(rank+1)`, rank bắt đầu từ 1.
- NDCG@K = DCG / IDCG; IDCG có `min(K, relevant count)` hits ở các vị trí đầu.
- Catalog coverage@K = số song IDs khác nhau được trả cho users được chấm /
  số songs trong eligible training catalog. Coverage tính riêng theo cohort/split/model.

Mean Recall/NDCG là macro mean trên users được chấm. Không gọi mean Precision là MAP;
evaluator này không báo MAP. [Fixture tính tay](../../Benchmark/fixtures/metric-hand-calculated.json):
ranking [1,2,3], relevant {2,4}, K=3 → Recall=0.5;
DCG=1/log2(3), IDCG=1+1/log2(3), NDCG≈0.38685280723454163.
Hai rankings [1,2], [2,3] trên catalog 4 bài → coverage=3/4.

## Kết quả hiện tại và giới hạn

Fixture có 12 users, 21 catalog entries, 18 eligible ở cutoff. Mỗi split chấm 10
users: warm 8/9, cold 2/3; 2 users không có relevant item được loại và công bố.
Kết quả test/all, K=5:

| Model | Recall@5 | NDCG@5 | Coverage@5 |
| --- | --- | --- | --- |
| Popularity | 0.3000 | 0.1292 | 0.3889 |
| Content-only | 0.8000 | 0.5047 | 0.7778 |
| Hybrid | 0.8000 | 0.5047 | 0.7778 |

Các cụm sở thích được dựng sẵn nên thuận lợi cho content matching. **Hybrid không
cải thiện so với Content-only trên fixture này**; dữ liệu chưa đủ đa dạng để kiểm
chứng lợi ích behavioral component. Cold test Recall/NDCG=0 cho cả ba model, vẫn
giữ kết quả này. Đây là functional evaluation trên synthetic, không independent
preference study, không chứng minh production uplift hoặc retention.

Smoke `benchmark.js` chỉ báo genre-match rate với targets demo thủ công; lý do engine
được bỏ qua hoàn toàn, missing slots tính không match. Không lấy chart PNG cũ hoặc
SQL demo legacy làm bằng chứng chất lượng. Python evaluation vẫn
[INCOMPLETE](../../experiments/EVALUATION_STATUS.md), không dùng scores trong showcase v1.

Xem [báo cáo nghiệm thu T15](../verification/T15.md) để biết kiểm tra đã chạy và giới hạn.
