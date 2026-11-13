-- ARCHIVED LEGACY SYNTHETIC DEMO: not a T14/T15 seed or quality evaluation.
-- Old schema/rebuild instructions below are historical; do not use for current deployment.
-- Use docs/evaluation/README.md and docs/DATABASE_SETUP_VI.md. No temporal quality claim.
/*
  recommendation_demo_seed.sql
  Purpose: Seed a controlled demo dataset for the hybrid music recommendation engine.

  HOW TO USE
  1) Create/copy a test database from the main schema first.
     Suggested database name: Recommend_music_web_test
  2) Change the USE line below if your test database has another name.
  3) Run this file in HeidiSQL or via Docker:
     docker exec -i music_web_db mysql -uroot -p123456 Recommend_music_web_test < recommendation_demo_seed.sql
  4) Start backend and call:
     POST /api/recommendations/rebuild-similarity
  5) Test APIs listed in recommendation_demo_test_cases.md

  WARNING: This script deletes existing demo/recommendation-related data in the selected database.
*/

USE `Recommend_music_web_test`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* =========================================================
   1. CLEAN DATA
   ========================================================= */
DELETE FROM `song_similarities`;
DELETE FROM `UserActivities`;
DELETE FROM `favorites`;
DELETE FROM `ratings`;
DELETE FROM `playlist_songs`;
DELETE FROM `playlists`;
DELETE FROM `refresh_tokens`;
DELETE FROM `song_artists`;
DELETE FROM `song_genres`;
DELETE FROM `songs`;
DELETE FROM `artists`;
DELETE FROM `genres`;
DELETE FROM `users`;

ALTER TABLE `song_similarities` AUTO_INCREMENT = 1;
ALTER TABLE `UserActivities` AUTO_INCREMENT = 1;
ALTER TABLE `ratings` AUTO_INCREMENT = 1;
ALTER TABLE `songs` AUTO_INCREMENT = 1;
ALTER TABLE `artists` AUTO_INCREMENT = 1;
ALTER TABLE `genres` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 1;

/* =========================================================
   2. USERS
   Password hash is a demo bcrypt hash; password value is not important for recommendation tests.
   User 5 has no behavior: cold-start / trending fallback test.
   ========================================================= */
INSERT INTO `users`
(`user_id`, `username`, `email`, `password`, `first_name`, `last_name`, `gender`, `role`, `is_active`, `activity_status`, `created_at`, `updated_at`)
VALUES
(1, 'demo_pop_user',     'demo_pop_user@example.com',     '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'Pop',     'User', 'male',   'user', 1, 'offline', NOW(), NOW()),
(2, 'demo_rap_user',     'demo_rap_user@example.com',     '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'Rap',     'User', 'male',   'user', 1, 'offline', NOW(), NOW()),
(3, 'demo_ballad_user',  'demo_ballad_user@example.com',  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'Ballad',  'User', 'female', 'user', 1, 'offline', NOW(), NOW()),
(4, 'demo_edm_user',     'demo_edm_user@example.com',     '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'EDM',     'User', 'other',  'user', 1, 'offline', NOW(), NOW()),
(5, 'demo_new_user',     'demo_new_user@example.com',     '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'New',     'User', 'other',  'user', 1, 'offline', NOW(), NOW()),
(6, 'demo_mixed_user',   'demo_mixed_user@example.com',   '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'Mixed',   'User', 'female', 'user', 1, 'offline', NOW(), NOW()),
(7, 'demo_admin',        'demo_admin@example.com',        '$2a$10$CwTycUXWue0Thq9StjUM0uJ8K0fKnWs6a0FbS7C4eh5g7qulYEguy', 'Demo',    'Admin','male',   'admin',1, 'offline', NOW(), NOW());

/* =========================================================
   3. GENRES
   ========================================================= */
INSERT INTO `genres` (`genre_id`, `name`, `normalized_name`) VALUES
(1, 'V-Pop',       'v-pop'),
(2, 'Ballad',      'ballad'),
(3, 'Rap Việt',    'rap-viet'),
(4, 'EDM',         'edm'),
(5, 'Acoustic',    'acoustic'),
(6, 'Indie',       'indie'),
(7, 'Lo-fi',       'lo-fi'),
(8, 'R&B',         'r-b'),
(9, 'Dance Pop',   'dance-pop'),
(10,'Chill',       'chill');

/* =========================================================
   4. ARTISTS
   ========================================================= */
INSERT INTO `artists` (`artist_id`, `name`, `image_url`, `normalized_name`) VALUES
(1,  'Wren Evans Demo',    NULL, 'wren-evans-demo'),
(2,  'Hoàng Dũng Demo',    NULL, 'hoang-dung-demo'),
(3,  'MCK Demo',           NULL, 'mck-demo'),
(4,  'Đen Vâu Demo',       NULL, 'den-vau-demo'),
(5,  'Touliver Demo',      NULL, 'touliver-demo'),
(6,  'Mỹ Tâm Demo',        NULL, 'my-tam-demo'),
(7,  'Sơn Tùng Demo',      NULL, 'son-tung-demo'),
(8,  'Chillies Demo',      NULL, 'chillies-demo'),
(9,  'AMEE Demo',          NULL, 'amee-demo'),
(10, 'JustaTee Demo',      NULL, 'justatee-demo'),
(11, 'Orange Demo',        NULL, 'orange-demo'),
(12, 'Min Demo',           NULL, 'min-demo');

/* =========================================================
   5. SONGS
   Clusters:
   1-6   : V-Pop / romantic / bright
   7-12  : Ballad / sad / acoustic
   13-18 : Rap / energetic / street
   19-24 : EDM / party / high energy
   25-26 : Lo-fi / chill, used as weak cross-cluster candidates
   ========================================================= */
INSERT INTO `songs`
(`song_id`, `title`, `duration`, `audio_url`, `image_url`, `view_count`, `is_visible`, `status`, `uploaded_by`, `created_at`, `updated_at`, `lyrics`, `mood`, `keywords`, `vector_embedding`)
VALUES
(1,  'DEMO Thích Em Hơi Nhiều',       200, 'https://example.com/audio/song-1.mp3',  'https://example.com/img/song-1.jpg',  960, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','romantic','secondary',JSON_ARRAY('bright','sweet'),'energy','medium','valence','positive'), JSON_ARRAY('tình yêu','nhớ nhung','hẹn hò','v-pop'), NULL),
(2,  'DEMO Yêu Là Đây',               205, 'https://example.com/audio/song-2.mp3',  'https://example.com/img/song-2.jpg',  930, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','romantic','secondary',JSON_ARRAY('bright','sweet'),'energy','medium','valence','positive'), JSON_ARRAY('tình yêu','hẹn hò','ngọt ngào','v-pop'), NULL),
(3,  'DEMO Nàng Thơ Thành Phố',       215, 'https://example.com/audio/song-3.mp3',  'https://example.com/img/song-3.jpg',  880, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','romantic','secondary',JSON_ARRAY('chill','bright'),'energy','medium','valence','positive'), JSON_ARRAY('tình yêu','thành phố','mộng mơ','acoustic'), NULL),
(4,  'DEMO Hẹn Em Cuối Tuần',         198, 'https://example.com/audio/song-4.mp3',  'https://example.com/img/song-4.jpg',  760, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','romantic','secondary',JSON_ARRAY('chill','sweet'),'energy','medium','valence','positive'), JSON_ARRAY('hẹn hò','tình yêu','cuối tuần','indie'), NULL),
(5,  'DEMO Cafe Và Em',               220, 'https://example.com/audio/song-5.mp3',  'https://example.com/img/song-5.jpg',  690, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','chill','secondary',JSON_ARRAY('romantic','bright'),'energy','low','valence','positive'), JSON_ARRAY('cafe','tình yêu','chill','v-pop'), NULL),
(6,  'DEMO Một Ngày Yêu',             210, 'https://example.com/audio/song-6.mp3',  'https://example.com/img/song-6.jpg',  640, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','romantic','secondary',JSON_ARRAY('bright'),'energy','medium','valence','positive'), JSON_ARRAY('tình yêu','ngày mới','hạnh phúc','pop'), NULL),

(7,  'DEMO Mưa Rơi Trong Tim',        245, 'https://example.com/audio/song-7.mp3',  'https://example.com/img/song-7.jpg',  820, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('acoustic','melancholy'),'energy','low','valence','negative'), JSON_ARRAY('mưa','chia tay','nỗi buồn','ballad'), NULL),
(8,  'DEMO Phố Cũ Buồn',              250, 'https://example.com/audio/song-8.mp3',  'https://example.com/img/song-8.jpg',  790, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('acoustic','melancholy'),'energy','low','valence','negative'), JSON_ARRAY('phố cũ','chia tay','nỗi buồn','ballad'), NULL),
(9,  'DEMO Lặng Im Sau Mưa',          240, 'https://example.com/audio/song-9.mp3',  'https://example.com/img/song-9.jpg',  730, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('chill','acoustic'),'energy','low','valence','negative'), JSON_ARRAY('mưa','im lặng','nhớ','acoustic'), NULL),
(10, 'DEMO Người Ở Lại',              255, 'https://example.com/audio/song-10.mp3', 'https://example.com/img/song-10.jpg',  710, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('melancholy'),'energy','low','valence','negative'), JSON_ARRAY('chia tay','người cũ','nỗi buồn','ballad'), NULL),
(11, 'DEMO Đêm Không Ngủ',            235, 'https://example.com/audio/song-11.mp3', 'https://example.com/img/song-11.jpg',  670, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('lofi','night'),'energy','low','valence','negative'), JSON_ARRAY('đêm','cô đơn','nhớ','lofi'), NULL),
(12, 'DEMO Gió Mang Ký Ức',           248, 'https://example.com/audio/song-12.mp3', 'https://example.com/img/song-12.jpg',  620, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','sad','secondary',JSON_ARRAY('acoustic'),'energy','low','valence','negative'), JSON_ARRAY('ký ức','chia tay','gió','ballad'), NULL),

(13, 'DEMO Rap Đường Phố',            190, 'https://example.com/audio/song-13.mp3', 'https://example.com/img/song-13.jpg',  910, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','energetic','secondary',JSON_ARRAY('street','confident'),'energy','high','valence','positive'), JSON_ARRAY('rap','đường phố','flow','tự tin'), NULL),
(14, 'DEMO Flow Không Dừng',          185, 'https://example.com/audio/song-14.mp3', 'https://example.com/img/song-14.jpg',  870, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','energetic','secondary',JSON_ARRAY('street','confident'),'energy','high','valence','positive'), JSON_ARRAY('rap','flow','battle','đường phố'), NULL),
(15, 'DEMO Thành Phố Không Ngủ',      195, 'https://example.com/audio/song-15.mp3', 'https://example.com/img/song-15.jpg',  830, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','energetic','secondary',JSON_ARRAY('street','night'),'energy','high','valence','positive'), JSON_ARRAY('rap','thành phố','đêm','flow'), NULL),
(16, 'DEMO Một Mình Vẫn Chất',        200, 'https://example.com/audio/song-16.mp3', 'https://example.com/img/song-16.jpg',  700, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','confident','secondary',JSON_ARRAY('street','energetic'),'energy','high','valence','positive'), JSON_ARRAY('rap','tự tin','street','độc lập'), NULL),
(17, 'DEMO Beat Căng',                180, 'https://example.com/audio/song-17.mp3', 'https://example.com/img/song-17.jpg',  660, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','energetic','secondary',JSON_ARRAY('aggressive','street'),'energy','high','valence','positive'), JSON_ARRAY('rap','beat','battle','flow'), NULL),
(18, 'DEMO Verse Cuối',               188, 'https://example.com/audio/song-18.mp3', 'https://example.com/img/song-18.jpg',  610, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','energetic','secondary',JSON_ARRAY('street'),'energy','high','valence','neutral'), JSON_ARRAY('rap','verse','lyrics','đường phố'), NULL),

(19, 'DEMO Party Tonight',            175, 'https://example.com/audio/song-19.mp3', 'https://example.com/img/song-19.jpg',  980, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('dance','bright'),'energy','high','valence','positive'), JSON_ARRAY('party','dance','edm','đêm nay'), NULL),
(20, 'DEMO Neon Dance',               178, 'https://example.com/audio/song-20.mp3', 'https://example.com/img/song-20.jpg',  940, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('dance','bright'),'energy','high','valence','positive'), JSON_ARRAY('neon','dance','edm','club'), NULL),
(21, 'DEMO Bass Drop Sài Gòn',        182, 'https://example.com/audio/song-21.mp3', 'https://example.com/img/song-21.jpg',  850, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('dance','energetic'),'energy','high','valence','positive'), JSON_ARRAY('bass','edm','dance','sài gòn'), NULL),
(22, 'DEMO Summer Festival',          180, 'https://example.com/audio/song-22.mp3', 'https://example.com/img/song-22.jpg',  805, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('festival','bright'),'energy','high','valence','positive'), JSON_ARRAY('festival','summer','dance','edm'), NULL),
(23, 'DEMO Electric Love',            192, 'https://example.com/audio/song-23.mp3', 'https://example.com/img/song-23.jpg',  760, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('romantic','dance'),'energy','high','valence','positive'), JSON_ARRAY('love','electric','dance','edm'), NULL),
(24, 'DEMO Midnight Club',            176, 'https://example.com/audio/song-24.mp3', 'https://example.com/img/song-24.jpg',  720, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','party','secondary',JSON_ARRAY('night','dance'),'energy','high','valence','positive'), JSON_ARRAY('club','night','dance','edm'), NULL),

(25, 'DEMO Lo-fi Study Night',        230, 'https://example.com/audio/song-25.mp3', 'https://example.com/img/song-25.jpg',  500, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','chill','secondary',JSON_ARRAY('lofi','study'),'energy','low','valence','neutral'), JSON_ARRAY('lofi','study','chill','night'), NULL),
(26, 'DEMO Chill Morning',            225, 'https://example.com/audio/song-26.mp3', 'https://example.com/img/song-26.jpg',  530, 1, 'approved', 7, NOW(), NOW(), NULL, JSON_OBJECT('primary','chill','secondary',JSON_ARRAY('bright','morning'),'energy','low','valence','positive'), JSON_ARRAY('morning','chill','coffee','relax'), NULL);

/* =========================================================
   6. SONG-GENRE RELATIONS
   ========================================================= */
INSERT INTO `song_genres` (`song_id`, `genre_id`) VALUES
(1,1),(1,8), (2,1),(2,8), (3,1),(3,5), (4,1),(4,6), (5,1),(5,10), (6,1),(6,2),
(7,2),(7,5), (8,2),(8,5), (9,2),(9,5), (10,2), (11,2),(11,7), (12,2),(12,5),
(13,3), (14,3), (15,3), (16,3), (17,3), (18,3),
(19,4),(19,9), (20,4),(20,9), (21,4),(21,9), (22,4),(22,9), (23,4),(23,9), (24,4),(24,9),
(25,7),(25,10), (26,10),(26,5);

/* =========================================================
   7. SONG-ARTIST RELATIONS
   ========================================================= */
INSERT INTO `song_artists` (`song_id`, `artist_id`) VALUES
(1,1), (2,9), (3,2), (4,8), (5,10), (6,6),
(7,6), (8,2), (9,8), (10,11), (11,10), (12,6),
(13,3), (14,3), (15,4), (16,4), (17,3), (18,4),
(19,5), (20,5), (21,5), (22,12), (23,12), (24,5),
(25,10), (26,9);

/* =========================================================
   8. USER ACTIVITIES
   score = 1 + 4*completion_ratio + 3*listen_ratio - penalties
   Dates are in 2026 so they fit the partition definition in your current UserActivities table.
   ========================================================= */
INSERT INTO `UserActivities`
(`user_id`, `song_id`, `session_id`, `source`, `exit_reason`, `max_position_reached`, `play_pause_count`, `seek_count`, `song_duration`, `total_listened_time`, `created_at`)
VALUES
/* User 1: Pop/Romantic preference. Song 1 is intentionally repeated >2 times. */
(1,1,'u1-pop-001','search','ended',200,1,0,200,198,'2026-06-01 09:00:00'),
(1,1,'u1-pop-002','playlist','ended',200,0,0,200,200,'2026-06-02 09:00:00'),
(1,1,'u1-pop-003','recommendation','ended',198,0,0,200,190,'2026-06-03 09:00:00'),
(1,2,'u1-pop-004','search','ended',205,0,0,205,200,'2026-06-04 09:00:00'),
(1,3,'u1-pop-005','playlist','ended',215,1,1,215,205,'2026-06-05 09:00:00'),
(1,5,'u1-pop-006','playlist','skipped',40,0,0,220,35,'2026-06-06 09:00:00'),

/* User 2: Rap/Energetic preference. */
(2,13,'u2-rap-001','search','ended',190,0,0,190,188,'2026-06-01 10:00:00'),
(2,14,'u2-rap-002','playlist','ended',185,0,0,185,182,'2026-06-02 10:00:00'),
(2,15,'u2-rap-003','recommendation','ended',195,1,0,195,190,'2026-06-03 10:00:00'),
(2,17,'u2-rap-004','playlist','ended',178,0,1,180,170,'2026-06-04 10:00:00'),
(2,1, 'u2-rap-005','search','skipped',35,0,0,200,30,'2026-06-05 10:00:00'),

/* User 3: Ballad/Sad preference. */
(3,7, 'u3-ballad-001','search','ended',245,0,0,245,242,'2026-06-01 11:00:00'),
(3,8, 'u3-ballad-002','playlist','ended',250,1,0,250,245,'2026-06-02 11:00:00'),
(3,9, 'u3-ballad-003','playlist','ended',238,0,0,240,230,'2026-06-03 11:00:00'),
(3,12,'u3-ballad-004','recommendation','ended',245,0,1,248,235,'2026-06-04 11:00:00'),
(3,20,'u3-ballad-005','search','skipped',30,0,0,178,25,'2026-06-05 11:00:00'),

/* User 4: EDM/Party preference. */
(4,19,'u4-edm-001','search','ended',175,0,0,175,174,'2026-06-01 12:00:00'),
(4,20,'u4-edm-002','playlist','ended',178,0,0,178,176,'2026-06-02 12:00:00'),
(4,21,'u4-edm-003','playlist','ended',182,1,0,182,180,'2026-06-03 12:00:00'),
(4,22,'u4-edm-004','recommendation','ended',180,0,1,180,172,'2026-06-04 12:00:00'),
(4,7, 'u4-edm-005','search','skipped',40,0,0,245,35,'2026-06-05 12:00:00'),

/* User 6: Mixed user. Creates shared behavioral links across clusters. */
(6,1, 'u6-mix-001','playlist','ended',200,0,0,200,198,'2026-06-01 13:00:00'),
(6,2, 'u6-mix-002','playlist','ended',205,0,0,205,203,'2026-06-02 13:00:00'),
(6,3, 'u6-mix-003','playlist','ended',213,0,1,215,205,'2026-06-03 13:00:00'),
(6,13,'u6-mix-004','playlist','ended',188,0,0,190,185,'2026-06-04 13:00:00'),
(6,14,'u6-mix-005','playlist','ended',184,0,0,185,182,'2026-06-05 13:00:00'),
(6,19,'u6-mix-006','playlist','ended',173,0,0,175,170,'2026-06-06 13:00:00'),
(6,20,'u6-mix-007','playlist','ended',176,0,0,178,174,'2026-06-07 13:00:00'),
(6,25,'u6-mix-008','radio','ended',220,0,0,230,210,'2026-06-08 13:00:00');

/* =========================================================
   9. FAVORITES
   ========================================================= */
INSERT INTO `favorites` (`user_id`, `song_id`, `created_at`, `updated_at`) VALUES
(1,1,'2026-06-06 18:00:00','2026-06-06 18:00:00'),
(1,2,'2026-06-06 18:01:00','2026-06-06 18:01:00'),
(2,13,'2026-06-06 18:02:00','2026-06-06 18:02:00'),
(2,14,'2026-06-06 18:03:00','2026-06-06 18:03:00'),
(3,7,'2026-06-06 18:04:00','2026-06-06 18:04:00'),
(3,8,'2026-06-06 18:05:00','2026-06-06 18:05:00'),
(4,19,'2026-06-06 18:06:00','2026-06-06 18:06:00'),
(4,20,'2026-06-06 18:07:00','2026-06-06 18:07:00'),
(6,1,'2026-06-06 18:08:00','2026-06-06 18:08:00'),
(6,13,'2026-06-06 18:09:00','2026-06-06 18:09:00');

/* =========================================================
   10. RATINGS
   ========================================================= */
INSERT INTO `ratings` (`rating_id`, `user_id`, `song_id`, `score`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 5, '2026-06-07 08:00:00','2026-06-07 08:00:00'),
(2, 1, 3, 4, '2026-06-07 08:01:00','2026-06-07 08:01:00'),
(3, 1, 5, 2, '2026-06-07 08:02:00','2026-06-07 08:02:00'),
(4, 2, 13,5, '2026-06-07 08:03:00','2026-06-07 08:03:00'),
(5, 2, 15,4, '2026-06-07 08:04:00','2026-06-07 08:04:00'),
(6, 2, 1, 1, '2026-06-07 08:05:00','2026-06-07 08:05:00'),
(7, 3, 7, 5, '2026-06-07 08:06:00','2026-06-07 08:06:00'),
(8, 3, 9, 4, '2026-06-07 08:07:00','2026-06-07 08:07:00'),
(9, 3, 20,1, '2026-06-07 08:08:00','2026-06-07 08:08:00'),
(10,4, 19,5, '2026-06-07 08:09:00','2026-06-07 08:09:00'),
(11,4, 21,4, '2026-06-07 08:10:00','2026-06-07 08:10:00'),
(12,4, 7, 1, '2026-06-07 08:11:00','2026-06-07 08:11:00'),
(13,6, 1, 5, '2026-06-07 08:12:00','2026-06-07 08:12:00'),
(14,6, 2, 4, '2026-06-07 08:13:00','2026-06-07 08:13:00'),
(15,6, 13,5, '2026-06-07 08:14:00','2026-06-07 08:14:00'),
(16,6, 19,4, '2026-06-07 08:15:00','2026-06-07 08:15:00');

SET FOREIGN_KEY_CHECKS = 1;

/* =========================================================
   11. QUICK COUNT CHECKS
   ========================================================= */
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM `users`
UNION ALL SELECT 'genres', COUNT(*) FROM `genres`
UNION ALL SELECT 'artists', COUNT(*) FROM `artists`
UNION ALL SELECT 'songs', COUNT(*) FROM `songs`
UNION ALL SELECT 'song_genres', COUNT(*) FROM `song_genres`
UNION ALL SELECT 'song_artists', COUNT(*) FROM `song_artists`
UNION ALL SELECT 'UserActivities', COUNT(*) FROM `UserActivities`
UNION ALL SELECT 'favorites', COUNT(*) FROM `favorites`
UNION ALL SELECT 'ratings', COUNT(*) FROM `ratings`
UNION ALL SELECT 'song_similarities_before_rebuild', COUNT(*) FROM `song_similarities`;
