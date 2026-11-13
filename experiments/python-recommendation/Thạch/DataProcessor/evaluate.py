import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
from sklearn.metrics import mean_squared_error, mean_absolute_error
import os

# 1. Khai báo đường dẫn tĩnh (Do các file đã nằm chung một thư mục)
MODEL_PATH = 'data/baseline_mf.keras'
DATA_PATH = 'data/test_set.csv'

def evaluate_model():
    print("⏳ Đang khởi động hệ thống đánh giá Baseline MF (Keras)...")

    # 2. Nạp và kiểm tra dữ liệu Test
    if not os.path.exists(DATA_PATH):
        print(f"❌ Lỗi: Không tìm thấy file '{DATA_PATH}'. Vui lòng đảm bảo file nằm cùng thư mục với script này.")
        return
        
    test_df = pd.read_csv(DATA_PATH)
    print(f"✅ Đã nạp thành công {len(test_df)} dòng dữ liệu test.")

    # 3. Nạp Mô hình AI
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Lỗi: Không tìm thấy file '{MODEL_PATH}'. Vui lòng kiểm tra lại tên file.")
        return
        
    try:
        model = load_model(MODEL_PATH)
        print(f"✅ Đã nạp thành công mô hình từ '{MODEL_PATH}'.")
    except Exception as e:
        print(f"❌ Lỗi hệ thống khi nạp kiến trúc AI: {e}")
        return

    print("\n🤖 AI đang tiến hành suy luận (Inference), vui lòng chờ...")
    
    # 4. Bóc tách dữ liệu đầu vào (Features & Labels)
    # Cấu trúc đầu vào phải khớp tuyệt đối với kiến trúc Keras lúc huấn luyện
    X_test_user = test_df['user_index'].values
    X_test_item = test_df['item_index'].values
    y_true = test_df['rating'].values

    # Thực thi dự đoán
    y_pred = model.predict([X_test_user, X_test_item])

    print("\n🧮 Đang tính toán các chỉ số đo lường hiệu năng...")
    
    # 5. Phân tích sai số Toán học
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)

    # 6. Xuất báo cáo kỹ thuật
    print("\n" + "="*50)
    print(" BÁO CÁO ĐÁNH GIÁ HIỆU NĂNG MATRIX FACTORIZATION ")
    print("="*50)
    print(f"🔸 MSE  (Mean Squared Error)       : {mse:.4f}")
    print(f"🎯 RMSE (Root Mean Squared Error) : {rmse:.4f}")
    print(f"🎯 MAE  (Mean Absolute Error)     : {mae:.4f}")
    print("="*50)
    print("Ghi chú: Thông số đã được chốt. Giai đoạn 2 hoàn tất 100%.")

if __name__ == "__main__":
    evaluate_model()