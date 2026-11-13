from src.ranking.heuristic_ranker import HeuristicRanker

class Recommender:
    def __init__(self, cf_model, vector_gen, popularity_gen):
        self.cf = cf_model
        self.vector_gen = vector_gen
        self.popularity = popularity_gen
        self.ranker = HeuristicRanker()
    
    def recommend(self, user_id, liked_songs=None, top_k=10):
        liked_songs = liked_songs or []

        # --- 1. Thu thập ứng viên (Candidate Generation) ---
        # Lấy candidates kèm theo điểm số gốc của chúng (Raw Scores)
        cf_candidates = self.cf.get_candidates(user_id) 
        # --- THÊM DÒNG NÀY ĐỂ DEBUG ---
        if user_id == 1:
            print(f"🔍 DEBUG Vector candidates cho User 1 (Top 5): {cf_candidates[:5]}")
        # ------------------------------
        
        vec_candidates = []
        if liked_songs:
            # Lấy nhiều ứng viên hơn (ví dụ 50 bài) để Ranker có dữ liệu lọc
            vec_candidates = self.vector_gen.get_candidates(liked_songs, num_candidates=50)

        # --- THÊM DÒNG NÀY ĐỂ DEBUG ---
        if user_id == 1:
            print(f"🔍 DEBUG Vector candidates cho User 1 (Top 5): {vec_candidates[:5]}")
        # ------------------------------

        pop_candidates = self.popularity.get_top(num_candidates=20)

        # --- THÊM DÒNG NÀY ĐỂ DEBUG ---
        if user_id == 1:
            print(f"🔍 DEBUG Vector candidates cho User 1 (Top 5): {pop_candidates[:5]}")
        # ------------------------------

        # --- 2. Hợp nhất và gán điểm (Ranking Stage) ---
        # Chuyển thành dictionary để tra cứu điểm nhanh
        cf_map = {c['song_id']: c['score'] for c in cf_candidates}
        vec_map = {c['song_id']: c['score'] for c in vec_candidates}
        pop_map = {c['song_id']: c['score'] for c in pop_candidates}

        # Tập hợp tất cả ID không trùng lặp
        all_candidate_ids = set(cf_map.keys()) | set(vec_map.keys()) | set(pop_map.keys())
        
        scored_list = []
        for s_id in all_candidate_ids:
            # Loại bỏ bài hát user ĐÃ NGHE để không làm loãng kết quả test
            if s_id in liked_songs:
                continue

            # Lấy điểm thực tế (0.0 nếu không xuất hiện)
            s_cf = cf_map.get(s_id, 0.0)
            s_vec = vec_map.get(s_id, 0.0)
            s_pop = pop_map.get(s_id, 0.0)

            # Tính điểm cuối cùng dựa trên trọng số Heuristic
            final_score = self.ranker.score(s_cf, s_vec, s_pop)
            scored_list.append({"song_id": s_id, "score": final_score})

        # --- 3. Sắp xếp và trả về Top 10 ---
        ranked = sorted(scored_list, key=lambda x: x["score"], reverse=True)
        return ranked[:top_k]
