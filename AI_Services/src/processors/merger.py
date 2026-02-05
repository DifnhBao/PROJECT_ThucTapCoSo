import pandas as pd
import os

def sync_and_save_data(df_mongo_final, df_mysql_final, csv_path):
    # 1. Hợp nhất tối thượng (Max Rating của cả 2 nguồn)
    new_real_data = pd.concat([df_mongo_final, df_mysql_final])
    new_real_data = new_real_data.groupby(['user_id', 'song_id'])['rating'].max().reset_index()

    # Đánh dấu đây là dữ liệu thật
    new_real_data['is_seed'] = 0 

    if os.path.exists(csv_path):
        old_data = pd.read_csv(csv_path)

        # Nếu dữ liệu cũ chưa có cột is_seed (tức là file mồi ban đầu), gán là 1
        if 'is_seed' not in old_data.columns:
            old_data['is_seed'] = 1

        # Gộp cũ + mới. Nếu trùng (user, song) thì lấy cái mới nhất
        updated_data = pd.concat([old_data, new_real_data]).drop_duplicates(
            subset = ['user_id', 'song_id'], 
            keep='last'
        )

        # LOGIC ƯU TIÊN: Kiểm tra ngưỡng 20,000 dòng
        if len(updated_data) > 20000:
            # Tách riêng dữ liệu mồi và dữ liệu thật
            seed_data = updated_data[updated_data['is_seed'] == 1]
            real_data = updated_data[updated_data['is_seed'] == 0]

            if not seed_data.empty:
                # Tính số lượng dòng dư thừa cần phải loại bỏ
                excess_count = len(updated_data) - 20000

                # Xóa dần dữ liệu mồi (xóa từ trên đầu xuống)
                seed_data = seed_data.iloc[min(len(seed_data), excess_count):]

                # Gộp lại: Dữ liệu mồi đã bớt đi và dữ liệu thật được giữ nguyên
                updated_data = pd.concat([seed_data, real_data])

                # Lưu ý: Nếu seed_data đã rỗng, updated_data sẽ không bị iloc nữa 
                # và file sẽ tự động nở ra theo lượng dữ liệu thật.

            updated_data.to_csv(csv_path, index=False)
            print(f"✅ Đã cập nhật file train. Tổng số dòng: {len(updated_data)}")

        else:
            # Nếu file chưa tồn tại, lưu dữ liệu thật mới
            new_real_data.to_csv(csv_path, index=False)
