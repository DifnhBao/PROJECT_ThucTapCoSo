import pandas as pd
import numpy as np
import os
from src.config.settings import TRAIN_DATA_CSV
from src.api.server import recommender 

# print(TRAIN_DATA_CSV)

def run_evaluation():
    print("📊 Đang bắt đầu quy trình đánh giá hệ khuyến nghị...")
    
    # 1. Load dữ liệu đã xử lý
    df = pd.read_csv(TRAIN_DATA_CSV)
    
    # 2. Chia tập Test (Lấy 20% tương tác cuối cùng của mỗi user)
    test_data = df.groupby('user_id').tail(2) # Lấy 2 bài hát cuối của mỗi user để test
    train_data = df.drop(test_data.index)
    
    users_to_test = test_data['user_id'].unique()
    hits = 0
    mrr = 0
    total_queries = len(users_to_test)

    print(f"🧐 Đang kiểm tra trên {total_queries} người dùng mẫu...")

    for user_id in users_to_test:
        history = train_data[train_data['user_id'] == user_id]['song_id'].tolist()
        # Danh sách bài hát user THỰC TẾ đã nghe trong tập Test
        actual_liked = test_data[test_data['user_id'] == user_id]['song_id'].tolist()
        
        # Danh sách bài hát AI ĐỀ XUẤT (Top 10)
        recommended = recommender.recommend(user_id, liked_songs=history)

        # --- DÒNG DEBUG QUAN TRỌNG ---
        if user_id == 1:
            print(f"🔍 DEBUG User 1:")
            print(f"   - Đã nghe (History): {history}")
            print(f"   - Thực tế sẽ nghe (Test): {actual_liked}")
            print(f"   - AI gợi ý: {recommended}")
        # -----------------------------
        
        # Tính toán Hit Rate & MRR
        for i, song in enumerate(recommended):
            if song in actual_liked:
                hits += 1
                mrr += 1 / (i + 1) 
                break 

    # 3. Tổng hợp kết quả
    hit_rate = (hits / total_queries) * 100
    avg_mrr = mrr / total_queries

    print("-" * 30)
    print(f"✅ KẾT QUẢ ĐÁNH GIÁ:")
    print(f"⭐ Hit Rate @ 10: {hit_rate:.2f}%")
    print(f"⭐ Mean Reciprocal Rank (MRR): {avg_mrr:.4f}")
    print("-" * 30)
    print("💡 Giải thích: Hit Rate càng cao, khả năng user tìm thấy bài hát họ thích càng lớn.")

if __name__ == "__main__":
    run_evaluation()

# Chayj scripts: python -m src.scripts.evaluate  