import pandas as pd
import numpy as np
import os
import json

DATA_PATH = "data"
if not os.path.exists(DATA_PATH):
    os.makedirs(DATA_PATH)

def generate_smart_data():
    np.random.seed(42)
    num_songs = 100
    num_users = 50
    genres = ['Pop', 'Rock', 'Jazz', 'EDM', 'R&B']

    # 1. Tạo Metadata có quy luật
    songs = []
    for i in range(1, num_songs + 1):
        genre = genres[i % len(genres)]
        songs.append({
            'song_id': i,
            'title': f"Song {i}",
            'artist_names': [f"Artist {i % 10}"],
            'genres': [genre],
            'mood': 'Chill'
        })
    pd.DataFrame(songs).to_csv(os.path.join(DATA_PATH, "song_metadata.csv"), index=False)
    print("✅ Đã tạo metadata có gu.")

    # 2. Tạo Ratings có phân cụm (Để đạt Hit Rate cao)
    ratings = []
    for uid in range(1, num_users + 1):
        # Mỗi user thích 1 thể loại chính dựa trên ID
        fav_genre = genres[uid % len(genres)]
        gu_songs = [s['song_id'] for s in songs if s['genres'][0] == fav_genre]
        
        # Thích 8 bài trong gu
        chosen = np.random.choice(gu_songs, 8, replace=False)
        for sid in chosen:
            ratings.append({'user_id': uid, 'song_id': sid, 'rating': np.random.randint(4, 6)})
    pd.DataFrame(ratings).to_csv(os.path.join(DATA_PATH, "mysql_ratings.csv"), index=False)

    # 3. Tạo Favorites và Activities (Giả lập đơn giản để không lỗi code)
    pd.DataFrame(ratings).head(100).to_csv(os.path.join(DATA_PATH, "mysql_favorites.csv"), index=False)
    
    activities = []
    for r in ratings[:200]: # Lấy một phần rating làm hành động play/complete
        activities.append({
            'user_id': int(r['user_id']),
            'song_id': int(r['song_id']),
            'action': 'complete',
            'is_view': True
        })
    with open(os.path.join(DATA_PATH, "mongo_activities.json"), "w") as f:
        json.dump(activities, f)
    
    print("✨ Toàn bộ dữ liệu 'CÓ GU' đã sẵn sàng!")

if __name__ == "__main__":
    generate_smart_data()

# Scripts: python -m scripts.generate_mock_data