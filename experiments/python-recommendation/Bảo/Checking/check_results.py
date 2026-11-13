import pandas as pd

# Load dữ liệu nghệ sĩ
artists = pd.read_csv('../../data/MockData/artists.dat', sep='\t') # Đảm bảo file này có trong máy

# Danh sách ID mà API của bạn vừa trả về
recommended_ids = [14515, 289, 5305, 6733, 5297, 3692, 15892, 292, 8321, 7272]

print("--- PHÂN TÍCH DANH SÁCH GỢI Ý (Discovery) ---")
for i, aid in enumerate(recommended_ids):
    name = artists[artists['id'] == aid]['name'].values[0]
    print(f"Top {i+1}: {name} (ID: {aid})")

print("\n==============================================")

ids = [72, 89, 51, 55, 67, 63, 65, 69, 59, 91]
print("\n--- KIỂM TRA DANH SÁCH GỢI Ý (Re-listen) ---")
for i, aid in enumerate(ids):
    name = artists[artists['id'] == aid]['name'].values[0]
    print(f"Top {i+1}: {name} (ID: {aid})")
