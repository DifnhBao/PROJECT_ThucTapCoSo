import pandas as pd

def process_mysql_data(df_favorite, df_mysql_rating):
    # Gán 5 sao cho những bài trong danh sách Favorite
    df_favorite['rating'] = 5

    # Kết hợp rating có sẵn và favorite
    combined = pd.concat([df_mysql_rating, df_favorite])
    
    # Trả về DataFrame chỉ gồm user_id, song_id, rating
    return combined.groupby(['user_id', 'song_id'])['rating'].max().reset_index()