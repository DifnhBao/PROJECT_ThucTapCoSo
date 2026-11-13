from scripts.generate_mock_data import DATA_PATH

from pymongo import MongoClient
import pandas as pd
from src.config.settings import MONGO_URI

import os

def get_mongo_data():
    client = MongoClient(MONGO_URI)
    db = client.music
    
    # Loại bỏ _id: 0 để lấy dữ liệu gọn nhẹ hơn
    cursor = db.useractivities.find({}, {"_id": 0})
    
    df_mongo_implicit = pd.DataFrame(list(cursor))
    client.close() # Luôn đóng kết nối
    
    return df_mongo_implicit

    # Đọc trực tiếp từ file JSON thay vì MongoDB
    # return pd.read_json(os.path.join(DATA_PATH, "mongo_activities.json"))