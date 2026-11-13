import pandas as pd
import os

# Lấy đường dẫn hiện tại
current_dir = os.path.dirname(__file__)  # Thạch/DataProcessor/
ai_services_dir = os.path.dirname(os.path.dirname(current_dir))  # AI_Services/

user_artists_path = os.path.join(ai_services_dir, 'data', 'MockData', 'user_artists.dat')
artists_path = os.path.join(ai_services_dir, 'data', 'MockData', 'artists.dat')

print("=" * 60)
print("KHÁM PHÁ DỮ LIỆU LAST.FM")
print("=" * 60)

# 1. Đọc file user_artists.dat
print("\n1. FILE: user_artists.dat")
print("-" * 60)
df_user_artists = pd.read_csv(user_artists_path, sep='\t')
print(f" Số dòng: {len(df_user_artists):,}")
print(f" Số cột: {len(df_user_artists.columns)}")
print(f"\n Tên các cột: {list(df_user_artists.columns)}")
print(f"\n 5 dòng đầu tiên:")
print(df_user_artists.head())
print(f"\n Thống kê cột 'weight' (lượt nghe):")
print(df_user_artists['weight'].describe())

# 2. Đọc file artists.dat
print("\n\n2. FILE: artists.dat")
print("-" * 60)
df_artists = pd.read_csv(artists_path, sep='\t', 
                         names=['artistID', 'name', 'url', 'pictureURL'],
                         on_bad_lines='skip')
print(f" Số ca sĩ: {len(df_artists):,}")
print(f"\n 10 ca sĩ đầu tiên:")
print(df_artists.head(10))

# 3. Phân tích phân phối weight
print("\n\n3️. PHÂN TÍCH PHÂN PHỐI WEIGHT")
print("-" * 60)
print(f" Min weight: {df_user_artists['weight'].min()}")
print(f" Max weight: {df_user_artists['weight'].max()}")
print(f" Mean weight: {df_user_artists['weight'].mean():.2f}")
print(f" Median weight: {df_user_artists['weight'].median():.2f}")

# 4. Kiểm tra dữ liệu thiếu
print("\n\n4️. KIỂM TRA DỮ LIỆU THIẾU")
print("-" * 60)
print(df_user_artists.isnull().sum())

print("\n" + "=" * 60)
print(" KHÁM PHÁ HOÀN TẤT!")
print("=" * 60)