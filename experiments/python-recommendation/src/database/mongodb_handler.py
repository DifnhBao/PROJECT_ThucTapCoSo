from pymongo import MongoClient
import pandas as pd
from src.config.settings import MONGO_URI

def get_mongo_data():
    # Kết nối MongoDB và thực hiện: db.useractivities.find()
    client = MongoClient(MONGO_URI)

    db = client.music

    cursor = db.useractivities.find()
    df_mongo_implicit = pd.DataFrame(list(cursor))
    
    # Trả về: pd.DataFrame: df_mongo_implicit
    return df_mongo_implicit
    pass