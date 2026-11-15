# T14 — Query / latency (synthetic local)

MySQL 8.0.46. First-call không flush DB cache; warm median của 3 lượt. Không suy ra production hoặc % cải thiện.

| Trường hợp | Queries/call | First-call ms | Warm median ms |
| --- | --- | --- | --- |
| similar-25 | 3 | 10.924 | 11.645 |
| personal-25 | 6 | 15.462 | 14.427 |
| cold-start-25 | 4 | 7.949 | 8.246 |
| similar-128 | 3 | 12.379 | 12.783 |
| personal-128 | 6 | 18.47 | 16.099 |
| personal-20seeds-128 | 6 | 31.831 | 29.971 |

Counts khi đo cuối: {"songs": 131, "activities": 2, "favorites": 24, "ratings": 2}. Rebuild 128 eligible songs tạo 6400 edges trong 701 ms; interaction rows trong lần rebuild: 6. Các favorites thêm để đo 20 seeds sau rebuild không cần tính lại neighbors để kiểm tra serving.

EXPLAIN raw và SQL thực tế nằm trong query-latency.json. Neighbor ranking index loại filesort ở actual query; batch 20 seeds ước lượng 1.000 neighbor rows rồi PK lookup songs. Activity index chưa được optimizer chọn trên fixture 2 rows.
