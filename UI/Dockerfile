FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Stage dev: dùng khi docker-compose override command ---
FROM base AS dev
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Stage production: build tĩnh rồi start ---
FROM base AS production
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]