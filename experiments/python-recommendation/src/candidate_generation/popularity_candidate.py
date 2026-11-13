import heapq

class PopularityCandidate:
    def __init__(self, popularity_dict):
        self.popularity = popularity_dict

    def get_top(self, num_candidates=50):
        if not self.popularity:
            return []
            
        # Tìm giá trị lớn nhất để chuẩn hóa điểm số
        max_pop = max(self.popularity.values()) if self.popularity else 1
            
        top_ids = heapq.nlargest(
            num_candidates, 
            self.popularity.keys(), 
            key=self.popularity.get
        )

        return [
            {
                "song_id": int(sid), 
                "score": self.popularity[sid] / max_pop # Điểm chuẩn hóa từ 0 đến 1
            } 
            for sid in top_ids
        ]