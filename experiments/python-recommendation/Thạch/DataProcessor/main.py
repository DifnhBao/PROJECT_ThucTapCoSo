from fastapi import FastAPI, HTTPException
from tensorflow.keras.models import load_model
import numpy as np
import pickle
import os

app = FastAPI(title="Hệ Khuyến Nghị Âm Nhạc - API Service (Thạch)")

# 1. Khai báo các đường dẫn tĩnh 
MODEL_PATH = 'data/baseline_mf.keras'
MAPPING_PATH = 'data/item_to_index.pkl'

# Biến toàn cục
model = None
index_to_artist = {}
TOTAL_ITEMS = 0

@app.on_event("startup")
async def startup_event():
    global model, index_to_artist, TOTAL_ITEMS
    print("⏳ Đang khởi động Trạm dịch vụ AI...")

    # A. Nạp mô hình AI
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
        print("✅ [1/2] Đã nạp thành công cỗ máy AI.")
    else:
        print(f"❌ LỖI: Không tìm thấy {MODEL_PATH}")

    # B. Nạp Từ điển Map ngược từ file của Bảo
    if os.path.exists(MAPPING_PATH):
        with open(MAPPING_PATH, 'rb') as f:
            item_to_index = pickle.load(f)
        # Lật ngược để tra cứu
        index_to_artist = {v: k for k, v in item_to_index.items()}
        TOTAL_ITEMS = len(index_to_artist)
        print(f"✅ [2/2] Đã nạp từ điển: Nhận diện được {TOTAL_ITEMS} ca sĩ.")
    else:
        print(f"❌ LỖI: Không tìm thấy {MAPPING_PATH}")


@app.get("/recommend/mf/{user_id}")
async def recommend_mf(user_id: int):
    """
    Endpoint nhận user_id -> AI tính toán -> Trả về ID gốc của ca sĩ
    """
    if model is None or TOTAL_ITEMS == 0:
        raise HTTPException(status_code=500, detail="Hệ thống AI chưa khởi động hoàn tất.")

    user_input = np.array([user_id] * TOTAL_ITEMS)
    item_input = np.array(range(TOTAL_ITEMS))

    # AI Dự đoán
    predictions = model.predict([user_input, item_input], verbose=0)
    predictions = predictions.flatten()

    # Lấy Top 10 cao điểm nhất
    top_10_indices = predictions.argsort()[-10:][::-1]

    recommendations = []
    for rank, idx in enumerate(top_10_indices):
        item_index = int(idx)
        predicted_score = float(predictions[idx])
        
        # 💡 ĐÃ SỬA LỖI: Ép kiểu về Chuỗi (String) bằng lệnh str()
        # Biến artist_name bây giờ sẽ mang giá trị chuỗi của ID gốc (vd: "12345")
        artist_name = str(index_to_artist.get(item_index, f"Ca sĩ ẩn danh ({item_index})"))

        recommendations.append({
            "rank": rank + 1,
            "artist_name": artist_name, 
            "image_url": "https://dummyimage.com/200x200/cccccc/000000&text=Artist+" + artist_name,
            "predicted_score": round(predicted_score, 2),
            "ai_debug_index": item_index
        })

    return {
        "status": "success",
        "user_id": user_id,
        "algorithm": "Baseline MF (Keras)",
        "recommendations": recommendations
    }