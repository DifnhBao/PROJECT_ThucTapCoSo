# Legacy synthetic demo — status after T15

Các SQL recommendation_demo_* là fixture demo lịch sử, không phải dataset đánh giá chất lượng theo thời gian. Chúng không tương thích đầy đủ với schema/session/listening/snapshot hiện tại. Không import vào database đang dùng để nghiệm thu hoặc production.

Không còn yêu cầu gọi HTTP rebuild, lưu mọi cặp hai chiều hoặc đạt số rows 650. T14 dùng offline CLI và top-K snapshot có version. Các session legacy không tự trở thành qualified receipt T11.

Kết quả hiện tại nằm ở [evaluation/README](../docs/evaluation/README.md) và [metrics CSV](../docs/evaluation/results/synthetic-v1/metrics.csv). Fixture temporal mới có nhãn synthetic, timestamp, global cutoffs, seed và data hash. Chỉ giữ demo genre matching dưới tên genre-consistency smoke test; không gọi nó là MAP hoặc preference accuracy.

Nghiệm thu kiểm tra công thức tính tay, không leakage, cùng eligibility/K/cohort cho baselines, reproducibility và công bố giới hạn. Không yêu cầu Hybrid thắng Content-only/Popularity. Không suy offline score thành retention uplift.
