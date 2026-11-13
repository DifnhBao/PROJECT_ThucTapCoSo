# AI Music Recommendation Service

## Cách cài đặt

1. Tạo môi trường ảo: `python -m venv venv`
2. Kích hoạt: `.\venv\Scripts\activate` (Windows)
3. Cài thư viện: `pip install -r requirements.txt`

## Cách khởi chạy

Chạy lệnh: `python src/main.py`
API sẽ lắng nghe tại: `http://localhost:8000`

## Cấu trúc dữ liệu

- `data/Trainning`: Chứa file CSV dùng để huấn luyện mô hình.
- `src/processors`: Chứa logic xử lý Rào chắn 20s và Hợp nhất DB.
