# TuneTrek — portfolio work in progress

Stack chính: Next.js, Express, MySQL và Cloudinary.

- [Hướng dẫn cấu hình và dữ liệu local](docs/CONFIGURATION_SETUP_VI.md)
- [Scope portfolio-v1](docs/PORTFOLIO_V1_SCOPE_VI.md)
- [Thứ tự thực hiện và nghiệm thu](docs/INTERN_PORTFOLIO_EXECUTION_PLAN_VI.md)
- [Báo cáo T03](docs/verification/T03.md)
- [Migrations, seed và MySQL tests](docs/DATABASE_SETUP_VI.md)
- [API contract và validation](docs/API_CONTRACT_VI.md)
- [Báo cáo T05](docs/verification/T05.md)
- [Vòng đời phiên và hướng dẫn nâng cấp](docs/SESSION_LIFECYCLE_VI.md)
- [Báo cáo T06](docs/verification/T06.md)
- [Quota, cookie/origin và trusted proxy](docs/SECURITY_POLICY_VI.md)
- [Báo cáo T07](docs/verification/T07.md)
- [Upload, idempotency và cleanup recovery](docs/UPLOAD_LIFECYCLE_VI.md)
- [Báo cáo T08](docs/verification/T08.md)
- [Playlist transaction và concurrency](docs/PLAYLIST_CONCURRENCY_VI.md)
- [Báo cáo T09](docs/verification/T09.md)
- [Player queue và phục hồi audio](docs/PLAYER_BEHAVIOR_VI.md)
- [Báo cáo T10](docs/verification/T10.md)
- [Listening event contract và delivery](docs/LISTENING_EVENTS_VI.md)
- [Báo cáo T11](docs/verification/T11.md)
- [HTTP, refresh và cache theo tài khoản](docs/HTTP_ACCOUNT_CACHE_VI.md)
- [Báo cáo T12](docs/verification/T12.md)
- [Quality gates và các cảnh báo còn lại](docs/QUALITY_GATES_VI.md)
- [Báo cáo T13](docs/verification/T13.md)
- [Khu vực nghiên cứu Python](experiments/README.md)
- [Recommendation v1 và rebuild snapshot](docs/RECOMMENDATION_ENGINE_VI.md)
- [Báo cáo T14](docs/verification/T14.md)
- [Đánh giá recommendation: protocol, baselines và kết quả synthetic](docs/evaluation/README.md)
- [Báo cáo T15](docs/verification/T15.md)
- [Routes và trạng thái giao diện](docs/PAGE_FLOWS_VI.md)
- [Báo cáo T16](docs/verification/T16.md)
- [Responsive và accessibility T17](docs/verification/T17.md)
- [Frontend performance T18](docs/performance/README.md)
- [Nghiệm thu T18](docs/verification/T18.md)
- [Chạy regression/integration/E2E](docs/TESTING_VI.md)
- [Nghiệm thu T19](docs/verification/T19.md)
- [Docker và operations runbook](docs/OPERATIONS_VI.md)
- [Nghiệm thu T20](docs/verification/T20.md)
- [CI và release/rollback](docs/RELEASE_VI.md)
- [Tiến độ T21 — chưa nghiệm thu remote](docs/verification/T21.md)

Yêu cầu Node 22.15+. Cài bằng `npm ci` trong `Server` và `UI`, điền env từ các
file mẫu rồi chạy tests bằng `npm test`. Không import các dump cá nhân cũ.
Schema dùng migrations và synthetic seed theo hướng dẫn database. Dự án chưa đạt
portfolio-v1 chỉ nhờ tests hoặc dependency audit; xem báo cáo từng task.
