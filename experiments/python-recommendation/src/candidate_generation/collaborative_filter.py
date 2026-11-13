from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix
import pandas as pd
import pickle
import os
from src.config.settings import MODEL_PATH

class CFModel:
    def __init__(self):
        self.user_similarity = None
        self.user_item_matrix = None
    
    def train(self, df):
        user_means = df.groupby('user_id')['rating'].mean()
        pivot = df.pivot_table(index='user_id', columns='song_id', values='rating')
        pivot_centered = pivot.sub(user_means, axis=0).fillna(0)

        self.user_item_matrix = pivot.fillna(0)
        sparse_matrix = csr_matrix(pivot_centered.values)
        sim = cosine_similarity(sparse_matrix)

        self.user_similarity = pd.DataFrame(sim, index=pivot.index, columns=pivot.index)    

        # Lưu model
        with open(os.path.join(MODEL_PATH, "user_similarity.pkl"), "wb") as f:
            pickle.dump((self.user_similarity, self.user_item_matrix), f)

    def get_candidates(self, user_id, k = 50):
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return [] # Cold Start
        
        # Tìm 5 người dùng giống nhất, lấy trung bình điểm của họ cho từng bài hát
        sim_users = self.user_similarity[user_id].sort_values(ascending=False).iloc[1:6].index
        sim_user_songs = self.user_item_matrix.loc[sim_users].mean(axis=0)

        # Lọc bài đã nghe
        user_heard = self.user_item_matrix.loc[user_id]
        already_heard = user_heard[user_heard > 0].index

        recommendations = sim_user_songs.drop(already_heard).sort_values(ascending=False).head(k)

        # return sim_user_songs.drop(already_heard).head(k).index.tolist()
        return [
            {
                "song_id": int(sid), 
                "score": float(score) / 5.0  # Chuẩn hóa về [0, 1] vì Rating tối đa là 5
            } 
            for sid, score in recommendations.items()
        ]
    