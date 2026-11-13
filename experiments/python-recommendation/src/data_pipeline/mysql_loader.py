from scripts.generate_mock_data import DATA_PATH

import mysql.connector
import pandas as pd
from src.config.settings import MYSQL_CONFIG

import os

def get_mysql_data():
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    
    try:
        rating_query = "SELECT user_id, song_id, score as rating FROM ratings"
        favorite_query = "SELECT user_id, song_id FROM favorites"

        df_mysql_rating = pd.read_sql(rating_query, conn)
        df_favorite = pd.read_sql(favorite_query, conn)
        
        # Gán 5 sao cho bài hát yêu thích theo logic Smart Rating
        df_favorite['rating'] = 5

        return df_mysql_rating, df_favorite
    finally:
        conn.close() 

    # Đọc trực tiếp từ file thay vì MySQL
    # df_mysql_rating = pd.read_csv(os.path.join(DATA_PATH, "mysql_ratings.csv"))
    # df_favorite = pd.read_csv(os.path.join(DATA_PATH, "mysql_favorites.csv"))
    # df_favorite['rating'] = 5
    # return df_mysql_rating, df_favorite