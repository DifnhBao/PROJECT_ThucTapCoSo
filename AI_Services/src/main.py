# Thứ tự gọi các hàm 
# Khi có một yêu cầu từ người dùng, main.py sẽ kích hoạt quy trình sau:
# Bước 1 (Lấy nguyên liệu): Gọi các hàm từ database.py để lấy 3 DataFrame thô (df_favorite, df_mysql_rating, df_mongo_implicit).
# Bước 2 (Mongo): Gọi process_mongo_data(df_mongo_implicit) để xử lý rào chắn 20s và tính điểm thưởng.
# Bước 3 (MySQL): Gọi process_mysql_data(df_favorite, df_mysql_rating) để gán 5 sao cho bài hát yêu thích.
# Bước 4 (Đóng gói - Merger): Gọi sync_and_save_data(...) để gộp kết quả từ Bước 2 và Bước 3, sau đó thực hiện ghi đè và "thay máu" dữ liệu mồi trong file CSV.
# Bước 5 (Xuất xưởng): Gọi get_recommendations() từ file recommender.py để lấy kết quả cuối cùng. Trả kết quả về Nodejs