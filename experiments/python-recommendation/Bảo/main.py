# Chạy: python -m uvicorn main:app --reload
from fastapi import FastAPI
import tensorflow as tf
import pickle
import numpy as np
import pandas as pd
import os

app = FastAPI(title="Music Recommendation API")

# Lấy đường dẫn của thư mục chứa file main.py hiện tại (chính là thư mục 'Bảo')
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Trỏ trực tiếp vào thư mục 'models' nằm bên trong thư mục 'Bảo'
MODELS_DIR = os.path.join(CURRENT_DIR, "models")


# 1. Load mô hình và các file ánh xạ khi khởi động API
with open(os.path.join(MODELS_DIR, "user_to_index.pkl"), "rb") as f:
    user_mapping = pickle.load(f)  # Cấu trúc: {Index: UserID}
    
with open(os.path.join(MODELS_DIR, "item_to_index.pkl"), "rb") as f:
    item_mapping = pickle.load(f)  # Cấu trúc: {Index: ArtistID}

# Đảo ngược từ điển User để tìm Index từ ID nhanh hơn (O(1) thay vì O(n))
user_id_to_idx = {v: k for k, v in user_mapping.items()}

# Load mô hình AI
model = tf.keras.models.load_model(os.path.join(MODELS_DIR, 'ncf_model.keras'))

# Load dữ liệu lịch sử để lọc
train_data = pd.read_csv(os.path.join(MODELS_DIR, "lastfm_clean.csv"))

# Gom nhóm sẵn các item_index đã nghe theo từng userID thành dạng dictionary
# Ví dụ: { user_1: [1, 5, 9], user_2: [2, 4] }
user_history_dict = train_data.groupby('user_index')['item_index'].apply(list).to_dict()

print("✅ Hệ thống đã sẵn sàng phục vụ!")

@app.get("/recommend/{user_id}")
async def recommend(user_id: int, type: str = "discover"):
    """
    type='discover': Gợi ý bài mới chưa nghe
    type='re-listen': Gợi ý bài đã nghe dựa trên sở thích
    """
    
    # Kiểm tra user có tồn tại trong hệ thống không
    u_idx = user_id_to_idx.get(user_id)
    
    if u_idx is None:
        return {"message": "User mới hoặc không tồn tại, trả về danh sách Trending", "recommendations": []}
    
    # Chuẩn bị dữ liệu dự đoán cho toàn bộ kho nhạc
    num_items = len(item_mapping)
    all_item_indices = np.arange(num_items)
    user_array = np.full(num_items, u_idx)

    # AI thực hiện dự đoán điểm số
    predictions = model.predict([user_array, all_item_indices], batch_size=512, verbose=0).flatten()

    # Lấy danh sách index các bài user ĐÃ NGHE
    # Tra cứu danh sách đã nghe siêu nhanh từ dictionary tạo sẵn
    heard_items = user_history_dict.get(user_id, [])

    if type == "discover":
        # KHÁM PHÁ: Ép điểm các bài ĐÃ NGHE xuống cực thấp để lọc ra bài MỚI
        predictions[heard_items] = -999
    else:
        # NGHE LẠI: Chỉ giữ điểm bài ĐÃ NGHE, các bài MỚI cho về -999
        mask = np.ones(len(predictions), dtype=bool)
        mask[heard_items] = False
        predictions[mask] = -999

    # Lấy Top 10 bài có điểm cao nhất sau khi lọc
    top_indices = predictions.argsort()[-10:][::-1]

    recommendations = []
    for idx in top_indices:
        idx_int = int(idx) # Chuyển về int chuẩn Python để tránh lỗi KeyError với numpy types
        
        if predictions[idx_int] > -100: # Chỉ lấy các bài không bị lọc (-999)
            recommendations.append({
                # Lấy ArtistID thật từ item_mapping bằng Index
                "artistID": int(item_mapping[idx_int]), 
                "score": float(np.clip(predictions[idx_int], 1.0, 5.0))
            })
            
    return {
        "user_id": user_id, 
        "type": type, 
        "total_results": len(recommendations),
        "recommendations": recommendations
    }