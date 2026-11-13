FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Chạy FastAPI từ Bảo/main.py
CMD ["uvicorn", "Bảo.main:app", "--host", "0.0.0.0", "--port", "8000"]
