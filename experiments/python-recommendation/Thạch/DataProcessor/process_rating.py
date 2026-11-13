import pandas as pd

print("============================================================")
print(" CHUYỂN ĐỔI LƯỢT NGHE (WEIGHT) SANG RATING (1-5)")
print("============================================================")

# 1. Đọc dữ liệu
print("\n1. Đang đọc dữ liệu từ user_artists.dat...")
input_path = '../../data/MockData/user_artists.dat'
df = pd.read_csv(input_path, sep='\t')

# 2. Sử dụng qcut để chia dữ liệu thành 5 nhóm (mỗi nhóm ~20%) và gán nhãn 1-5
print("2. Đang tính toán Quantile và gán điểm rating...")
df['rating'] = pd.qcut(df['weight'], q=5, labels=[1, 2, 3, 4, 5])

# 3. Lọc lại đúng 3 cột cần thiết cho mô hình AI
df_clean = df[['userID', 'artistID', 'rating']]

# 4. Xuất ra file CSV vào cùng thư mục MockData
output_path = '../BànGiao/lastfm_clean.csv'
df_clean.to_csv(output_path, index=False)

print(f"3. Hoàn tất! Đã lưu file: {output_path}")

print("\n------------------------------------------------------------")
print(" KẾT QUẢ KIỂM TRA")
print("------------------------------------------------------------")
print("5 dòng đầu tiên của dữ liệu mới:")
print(df_clean.head())

print("\nPhân bố số lượng các mức rating (nên xấp xỉ bằng nhau):")
print(df_clean['rating'].value_counts().sort_index())
print("============================================================")