import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data")
MODEL_PATH = os.path.join(BASE_DIR, "models")

# Đảm bảo các thư mục tồn tại
os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(MODEL_PATH, exist_ok=True)

TRAIN_DATA_CSV = os.path.join(DATA_PATH, "final_training_data.csv")
SONG_METADATA_CSV = os.path.join(DATA_PATH, "song_metadata.csv")

# DB Config - Get from environment variables
MYSQL_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "music_recommendation_system"),
    "port": int(os.getenv("DB_PORT", 3306))
}

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")