import json
import os
import pickle  
import numpy as np
import logging
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from src.recommender import Recommender
from src.candidate_generation.collaborative_filter import CFModel
from src.candidate_generation.vector_candidate import VectorCandidate
from src.candidate_generation.popularity_candidate import PopularityCandidate
from src.config.settings import MODEL_PATH

# --- Thiết lập Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

recommender = None

def load_models():
    try:
        # Load CF
        with open(os.path.join(MODEL_PATH, "user_similarity.pkl"), "rb") as f:
            user_sim, user_item = pickle.load(f)
        cf_model = CFModel()
        cf_model.user_similarity = user_sim
        cf_model.user_item_matrix = user_item

        # Load Vector Content
        song_vectors = np.load(os.path.join(MODEL_PATH, "song_vectors.npy"))

        with open(os.path.join(MODEL_PATH, "song_id_map.json"), "r") as f:
            song_id_map = json.load(f)
            
        song_id_map = {int(k): int(v) for k, v in song_id_map.items()}
        vector_gen = VectorCandidate(song_vectors, song_id_map)

        # Load Popularity
        with open(os.path.join(MODEL_PATH, "popularity.json"), "r") as f:
            pop_dict = json.load(f)
        pop_dict = {int(k): float(v) for k, v in pop_dict.items()}
        popularity_gen = PopularityCandidate(pop_dict)

        logger.info("Load models successfully!")
        return Recommender(cf_model, vector_gen, popularity_gen)
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global recommender
    recommender = load_models()
    yield
    recommender = None # Dọn dẹp RAM khi tắt server

app = FastAPI(title="Music Recommendation AI Service", lifespan=lifespan)

# Hàm giả lập truy vấn DB (query MySQL/MongoDB ở đây)
def get_user_liked_songs(user_id: int):
    # Ví dụ mock: Trả về danh sách rỗng nếu user mới, hoặc danh sách ID nếu user cũ
    return [1, 6, 16] if user_id == 1 else []

@app.get("/recommend/{user_id}")
def get_recommendation(user_id: int):
    if not recommender:
        raise HTTPException(status_code=503, detail="Models are not loaded yet.")

    liked_songs = get_user_liked_songs(user_id)
    
    recommendations = recommender.recommend(user_id, liked_songs=liked_songs)
    
    return {
        "status": "success",
        "user_id": user_id,
        "data": recommendations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)