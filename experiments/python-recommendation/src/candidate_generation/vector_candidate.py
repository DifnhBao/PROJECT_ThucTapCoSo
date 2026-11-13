from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class VectorCandidate:
    def __init__(self, song_vectors, song_id_map):
        self.song_vectors = song_vectors 
        self.song_id_map = song_id_map   # Dict {song_id: index_in_matrix}
        # Đảm bảo reverse_map lưu ID đúng kiểu dữ liệu (thường là int từ DB)
        self.reverse_map = {v: k for k, v in song_id_map.items()}

    def get_candidates(self, liked_song_ids, num_candidates=50):
        indices = [
            self.song_id_map[sid]
            for sid in liked_song_ids
            if sid in self.song_id_map
        ]

        if not indices:
            return []
        
        # Lấy trung bình vector các bài đã thích để tạo "User Interest Vector"
        user_vec = np.mean(self.song_vectors[indices], axis=0).reshape(1, -1)
        
        # Tính độ tương đồng Cosine:
        sim = cosine_similarity(user_vec, self.song_vectors)[0]
        
        # Lấy danh sách index của các bài hát tương đồng nhất
        top_indices = sim.argsort()[::-1] 
        candidates = []
        
        for i in top_indices:
            song_id = self.reverse_map[i]
            # Không lấy lại bài đã nghe và chỉ lấy đúng số lượng yêu cầu
            if song_id not in liked_song_ids:
                candidates.append({
                    "song_id": song_id,
                    "score": float(sim[i]) # Trả về điểm tương đồng thực tế (0.0 - 1.0)
                })
            if len(candidates) >= num_candidates:
                break
                
        return candidates