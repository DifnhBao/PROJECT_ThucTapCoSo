import mysql.connector
import pandas as pd
from src.config.settings import MYSQL_CONFIG

def get_mysql_data():
    # Kết nối MySQL và thực hiện: SELECT user_id, song_id, rating FROM ratings
    conn = mysql.connector.connect(
        host=MYSQL_CONFIG["host"],
        user=MYSQL_CONFIG["user"],
        password=MYSQL_CONFIG["password"],
        database=MYSQL_CONFIG["database"]
    )

    rating_query = "SELECT user_id, song_id, score as rating FROM ratings"
    favorite_query = "SELECT user_id, song_id FROM favorites"

    df_mysql_rating = pd.read_sql(rating_query, conn)
    df_favorite = pd.read_sql(favorite_query, conn)
    df_favorite['rating'] = 5

    # Trả về: pd.DataFrame: df_mysql_rating & df_favorite
    return df_mysql_rating, df_favorite
    pass