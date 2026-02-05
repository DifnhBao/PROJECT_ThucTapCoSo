import os
import random
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

# Lấy đường dẫn tuyệt đối đến thư mục LEARN
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Kết nối chính xác đến file csv
DATA_PATH = os.path.join(BASE_DIR, 'data', 'Trainning', 'final_training_data_v2.csv')

# 1. Đọc dữ liệu
train_data = pd.read_csv(DATA_PATH)

# --- Xử lý Mean-Centering ---
# Tính điểm trung bình của mỗi User (chỉ tính trên những bài họ đã rating)
# Trả lời cho câu hỏi: "Trung bình thì người này thường chấm bao nhiêu điểm?""
user_means = train_data.groupby('user_id')['rating'].mean()

# Tạo ma trận gốc (không fillna ngay để trừ trung bình chính xác)
# Trả lời cho câu hỏi: "Người nào chấm bài hát nào bao nhiêu điểm?"
user_item_matrix = train_data.pivot_table(index='user_id', columns='song_id', values='rating')

# Trừ đi điểm trung bình của mỗi User (Mean-Centering)
# Những bài chưa nghe sẽ mang giá trị NaN, những bài đã nghe sẽ có điểm quanh mốc 0
user_item_matrix_centered = user_item_matrix.sub(user_means, axis=0).fillna(0)

# 2. Tạo Pivot Table (Ma trận User-Item)
user_item_matrix = user_item_matrix.fillna(0)

# 3. Chuyển sang Sparse Matrix để tối ưu hiệu năng
sparse_matrix_centered = csr_matrix(user_item_matrix_centered.values)

# 4. Tính độ tương đồng giữa các User
user_similarity = cosine_similarity(sparse_matrix_centered)
user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

def get_recommendations(target_user_id, num_to_show=10, candidate_pool=50):
    if target_user_id not in user_sim_df.index:
        return [] # Xử lý trường hợp người dùng mới (Cold Start)

    # Tìm 5 người dùng giống nhất
    similar_users = user_sim_df[target_user_id].sort_values(ascending=False).iloc[1:6].index

    # Lấy các bài hát họ thích
    similar_user_songs = user_item_matrix.loc[similar_users].mean(axis=0).sort_values(ascending=False)
    
    # Lọc bài hát user mục tiêu đã nghe rồi
    user_heard = user_item_matrix.loc[target_user_id]
    already_heard = user_heard[user_heard > 0].index

    # Lấy danh sách các ứng viên tốt nhất (Candidate Pool)
    potential_recommendations = similar_user_songs.drop(already_heard).head(candidate_pool)

    # Chuyển index sang list bài hát
    recommendation_list = potential_recommendations.index.tolist()
    
    # Nếu số lượng ứng viên tìm được ít hơn hoặc bằng số lượng cần hiển thị, trả về toàn bộ
    if len(recommendation_list) <= num_to_show:
        return recommendation_list
    
    # Chọn ngẫu nhiên num_to_show bài hát từ danh sách ứng viên
    return random.sample(recommendation_list, num_to_show)


# ==========TEST===========

# --- Hàm hỗ trợ lấy tên bài hát từ ID ---
def get_song_titles(song_ids):
    # Lấy các hàng có song_id nằm trong danh sách, sau đó loại bỏ trùng lặp và tạo từ điển tra cứu
    titles_map = train_data[train_data['song_id'].isin(song_ids)][['song_id', 'title']].drop_duplicates()
    titles_dict = dict(zip(titles_map['song_id'], titles_map['title']))
    
    # Trả về danh sách tên theo đúng thứ tự của song_ids truyền vào
    return [titles_dict.get(sid, "Unknown Song") for sid in song_ids]

# Test thử cho một User bất kỳ trong dữ liệu
sample_user = train_data['user_id'].iloc[0]

# print(f"Lần 1 - Gợi ý cho User {sample_user}: {get_recommendations(sample_user)}")
# print(f"Lần 2 - Gợi ý cho User {sample_user}: {get_recommendations(sample_user)}")

# Lấy danh sách ID gợi ý
rec_ids_1 = get_recommendations(sample_user)
rec_ids_2 = get_recommendations(sample_user)

# Chuyển đổi sang tên bài hát
rec_titles_1 = get_song_titles(rec_ids_1)
rec_titles_2 = get_song_titles(rec_ids_2)

print(f"\n🎯 Gợi ý cho User: {sample_user}")
print(f"--------------------------------------------------")
print(f"Lần 1 (Ngẫu nhiên từ Top 50):")
for i, title in enumerate(rec_titles_1, 1):
    print(f"{i}. {title}")

print(f"\nLần 2 (Để kiểm tra tính đa dạng):")
for i, title in enumerate(rec_titles_2, 1):
    print(f"{i}. {title}")

def verify_neighbors(target_user_id):
    # Tìm 5 người giống nhất
    sim_users = user_sim_df[target_user_id].sort_values(ascending=False).iloc[1:6]
    print(f"--- Kiểm tra hàng xóm của {target_user_id} ---")
    for user, score in sim_users.items():
        # Lấy top 3 bài hát mà 'hàng xóm' này đánh giá cao nhất
        top_songs = train_data[train_data['user_id'] == user].sort_values(by='rating', ascending=False).head(3)['title'].tolist()
        print(f"Hàng xóm: {user} (Độ giống: {score:.2f}) - Thích: {top_songs}")

verify_neighbors(sample_user)