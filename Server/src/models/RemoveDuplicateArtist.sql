-- BƯỚC 0 — Backup
CREATE TABLE artists_backup AS SELECT * FROM artists;
CREATE TABLE song_artists_backup AS SELECT * FROM song_artists;

-- BƯỚC 1 — Kiểm tra dữ liệu trùng
SELECT TRIM(name) AS name, COUNT(*) AS count
FROM artists
GROUP BY TRIM(name)
HAVING count > 1;

-- Tắt chế độ only_full_group_by của MySQL
SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));

-- BƯỚC 2 — Xem chi tiết từng nhóm trùng
SELECT *
FROM artists
WHERE TRIM(name) IN (
  SELECT TRIM(name)
  FROM artists
  GROUP BY TRIM(name)
  HAVING COUNT(*) > 1
)
ORDER BY name, artist_id;

-- BƯỚC 3 — Tạo bảng mapping chuẩn
CREATE TEMPORARY TABLE artist_merge AS
SELECT 
  a.artist_id AS remove_id,
  b.keep_id
FROM artists a
JOIN (
  SELECT TRIM(name) AS name, MIN(artist_id) AS keep_id
  FROM artists
  GROUP BY TRIM(name)
) b 
ON TRIM(a.name) = b.name
WHERE a.artist_id <> b.keep_id;

SELECT * FROM artist_merge;

-- BƯỚC 4 — Cập nhật bảng trung gian
UPDATE song_artists sa
JOIN artist_merge am 
ON sa.artist_id = am.remove_id
SET sa.artist_id = am.keep_id;

-- BƯỚC 5 — Xóa artist trùng
DELETE a
FROM artists a
JOIN artist_merge am 
ON a.artist_id = am.remove_id;


-- BƯỚC 6 — Thêm UNIQUE constraint
ALTER TABLE artists 
ADD CONSTRAINT unique_artist_name UNIQUE (name);