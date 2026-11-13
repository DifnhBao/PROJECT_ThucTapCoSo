import pandas as pd

# Load dữ liệu
train_data = pd.read_csv('../models/lastfm_clean.csv')
artists = pd.read_csv('../../data/MockData/artists.dat', sep='\t')

# Lấy top 5 ca sĩ mà User 2 nghe nhiều nhất (Rating cao nhất)
user2_history = train_data[train_data['userID'] == 2].sort_values(by='rating', ascending=False).head(10)

print("--- 📜 LỊCH SỬ CỦA USER 2 (QUÁ KHỨ) ---")
for aid in user2_history['artistID']:
    name = artists[artists['id'] == aid]['name'].values[0]
    print(f"🎵 Đã nghe: {name}")