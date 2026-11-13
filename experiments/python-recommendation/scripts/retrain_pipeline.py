import os
import pickle
import json
import numpy as np
import pandas as pd
from src.config.settings import TRAIN_DATA_CSV, MODEL_PATH, SONG_METADATA_CSV
from src.data_pipeline.mysql_loader import get_mysql_data
from src.data_pipeline.mongo_loader import get_mongo_data
from src.data_pipeline.data_processor import DataProcessor
from src.candidate_generation.collaborative_filter import CFModel
from src.embeddings.metadata_vectorizer import MetadataVectorizer

def run_retrain_pipeline():
    print("Bắt đầu quá trình Retraining Pipeline...")
    processor = DataProcessor()

    # --- BƯỚC 1: Thu thập dữ liệu từ đa nguồn ---
    print("Đang lấy dữ liệu từ MySQL và MongoDB...")
    df_mongo_raw = get_mongo_data()
    df_mysql_rating, df_favorite = get_mysql_data()

    # --- BƯỚC 2: Chế biến dữ liệu (Smart Rating) ---
    print("Đang xử lý Smart Rating và gộp dữ liệu...")
    df_mongo_processed = processor.process_mongo_data(df_mongo_raw)
    final_train_df = processor.merge_with_mysql(df_mongo_processed, df_mysql_rating, df_favorite)
    
    # Lưu lại file training để làm bằng chứng đánh giá (Evaluation)
    final_train_df.to_csv(TRAIN_DATA_CSV, index=False)
    print(f"Đã lưu dữ liệu huấn luyện tại: {TRAIN_DATA_CSV}")

    # --- BƯỚC 3: Huấn luyện Collaborative Filtering (CF) ---
    print("Đang huấn luyện mô hình Collaborative Filtering...")
    cf_model = CFModel()
    cf_model.train(final_train_df)
    print("Đã lưu user_similarity.pkl")

    # --- BƯỚC 4: Xây dựng Song Vectors (Content-based) ---
    print("Đang vector hóa Metadata bài hát...")
    # Giả sử bạn có file metadata bài hát (genre, mood, artist)
    song_metadata = pd.read_csv(SONG_METADATA_CSV)
    
    vectorizer = MetadataVectorizer()
    song_vectors = vectorizer.build_vectors(song_metadata)
    
    # Tạo song_id_map để AI hiểu được ID từ Database
    song_id_map = {str(int(id)): i for i, id in enumerate(song_metadata['song_id'])}
    
    # Lưu vector và map
    np.save(os.path.join(MODEL_PATH, "song_vectors.npy"), song_vectors)
    with open(os.path.join(MODEL_PATH, "song_id_map.json"), "w") as f:
        json.dump(song_id_map, f)
    print("Đã lưu song_vectors.npy và song_id_map.json")

    # --- BƯỚC 5: Tính toán Popularity (Xu hướng) ---
    print("Đang tính toán độ phổ biến của bài hát...")
    popularity_dict = final_train_df.groupby('song_id')['rating'].count().to_dict()
    with open(os.path.join(MODEL_PATH, "popularity.json"), "w") as f:
        json.dump(popularity_dict, f)
    
    print("Toàn bộ quá trình Retraining đã hoàn tất!")

if __name__ == "__main__":
    run_retrain_pipeline()

# Chạy scripts: python -m scripts.retrain_pipeline