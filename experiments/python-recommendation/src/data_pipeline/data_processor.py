import pandas as pd
import numpy as np

class DataProcessor:
    def calculate_smart_rating(self, row):
        # Lấy điểm hành động cao nhất (Max Quality)
        q_max = row['action_score_max']
        # Lấy điểm thưởng tần suất
        bonus = row['freq_bonus']
        
        # Rào chắn Logic: Chỉ cộng thưởng nếu đã từng nghe > 20s (điểm >= 3)
        if q_max >= 3:
            final_rating = q_max + bonus
        else:
            final_rating = q_max
            
        return min(5, final_rating)
    
    def process_mongo_data(self, df_mongo_implicit):
        # 1. Gán điểm cho từng hành động đơn lẻ (S_quality)
        def map_base_score(row):
            if row['action'] == 'complete':
                return 4
            if row['action'] == 'play':
                return 3 if row['is_view'] else 2
            if row['action'] == 'skip':
                return 1
            return 0
        
        # Tạo cột điểm tạm thời cho từng bản ghi
        df_mongo_implicit['temp_score'] = df_mongo_implicit.apply(map_base_score, axis=1)
        
        # 2. Nhóm theo (user_id, song_id) để lấy:
        # - action_score_max: Điểm cao nhất họ từng đạt được
        # - play_count: Tổng số lần tương tác để tính bonus
        aggregated = df_mongo_implicit.groupby(['user_id', 'song_id']).agg(
            action_score_max=('temp_score', 'max'),
            play_count=('temp_score', 'count')
        ).reset_index()

        def get_freq_bonus(count):
            if count > 5: return 2
            if count >= 3: return 1
            return 0
        
        aggregated['freq_bonus'] = aggregated['play_count'].apply(get_freq_bonus)

        # aggregated lúc này đã có đủ cột 'action_score_max' và 'freq_bonus'
        aggregated['rating'] = aggregated.apply(self.calculate_smart_rating, axis=1)

        return aggregated[['user_id', 'song_id', 'rating']]

    def merge_with_mysql(self, df_mongo_final, df_mysql_rating, df_favorite):
        combined = pd.concat([df_mongo_final, df_mysql_rating, df_favorite])

        final_df = combined.groupby(['user_id', 'song_id'])['rating'].max().reset_index()

        return final_df


# data nạp vào NCF
def prepare_data_for_ncf(self, final_df):
    """
    final_df là cái dataframe [user_id, song_id, rating] sau khi bạn đã merge xong
    """
    # 1. Ép kiểu user_id và song_id thành các số nguyên liên tục từ 0
    final_df['user_index'] = pd.factorize(final_df['user_id'])[0]
    final_df['song_index'] = pd.factorize(final_df['song_id'])[0]
    
    # 2. Lưu lại từ điển ánh xạ (Mapping dictionary) để sau này còn biết đường mà trả về web
    # Ví dụ: Keras bảo user_index 0 thích song_index 5 -> Phải map ngược lại ra song_id thật
    user_mapping = dict(zip(final_df['user_index'], final_df['user_id']))
    song_mapping = dict(zip(final_df['song_index'], final_df['song_id']))
    
    # 3. Lấy số lượng User và Song thực tế để cấu hình cho Keras Embedding Layer
    num_users = final_df['user_index'].nunique()
    num_songs = final_df['song_index'].nunique()
    
    # Đầu ra cuối cùng sẵn sàng nạp vào NCF:
    ncf_input_df = final_df[['user_index', 'song_index', 'rating']]
    
    return ncf_input_df, num_users, num_songs, user_mapping, song_mapping

# def process_mongo_data(self, df):
#     # 1. Group lại theo user-song
#     grouped = df.groupby(['user_id', 'song_id']).agg(
#         avg_completion=('completion_rate', 'mean'),
#         play_count=('completion_rate', 'count'),
#         last_timestamp=('timestamp', 'max')
#     ).reset_index()

#     # 2. Replay score (nghe lại nhiều lần)
#     def replay_score(count):
#         if count >= 5: return 1
#         if count >= 3: return 0.7
#         if count >= 2: return 0.4
#         return 0

#     grouped['replay_score'] = grouped['play_count'].apply(replay_score)

#     # 3. Recency score (gần đây nghe)
#     max_time = grouped['last_timestamp'].max()
#     grouped['recency_score'] = grouped['last_timestamp'].apply(
#         lambda t: 1 - (max_time - t).days / 30 if t else 0
#     ).clip(0, 1)

#     # 4. Final rating
#     grouped['rating'] = (
#         0.7 * grouped['avg_completion'] +
#         0.2 * grouped['replay_score'] +
#         0.1 * grouped['recency_score']
#     ) * 5

#     return grouped[['user_id', 'song_id', 'rating']]