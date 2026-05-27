FROM node:20-alpine

# Cài curl để healthcheck hoạt động
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

# CMD mặc định dùng start (production)
# docker-compose.yml override thành "npm run dev" để hot reload
CMD ["npm", "run", "start"]