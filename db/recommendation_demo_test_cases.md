# Recommendation verification after T15

1. Chạy `node Benchmark/generate-fixture.cjs` từ repo root để tạo lại fixture synthetic seed 150015.
2. Chạy `node Benchmark/evaluate.cjs --input Benchmark/fixtures/temporal-synthetic-v1.json --out docs/evaluation/results/synthetic-v1 --k 5`.
3. Chạy `node Benchmark/benchmark.js --input Benchmark/fixtures/genre-smoke.json` cho smoke thể loại riêng biệt.
4. Chạy `npm --prefix Server test` để kiểm tra metric tính tay, temporal isolation, validation, shared serving parity và reproducibility.
5. MySQL snapshot regression: dùng database disposable theo DATABASE_SETUP_VI, `npm --prefix Server run test:recommendation:integration`. Lệnh reset test DB; không chạy song song trên cùng database. Có thể đặt RECOMMENDATION_EVIDENCE_DIR để giữ evidence của task đang làm.

Đọc [evaluation/README](../docs/evaluation/README.md) về policy và giới hạn. Không dùng công thức genre matching làm relevant ground truth, không lấy câu reason của engine để chấm serendipity. HTTP rebuild hiện trả 409; maintenance dùng CLI offline, không có kỳ vọng precompute mọi cặp.

Các SQL demo trong thư mục này được giữ như artifact lịch sử, chưa chuyển đổi thành fixture current-schema. Không dùng các lệnh import/root account/rebuild cũ làm hướng dẫn triển khai. Không dùng số liệu Python experimental trong showcase v1 khi trạng thái còn incomplete.
