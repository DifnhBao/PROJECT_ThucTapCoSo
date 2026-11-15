FROM node:22.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM dependencies AS source
COPY src ./src
COPY config ./config
COPY database ./database
COPY migrations ./migrations
COPY scripts ./scripts

# One-shot DDL image; sequelize-cli is intentionally available only here.
FROM source AS migration
USER node
CMD ["node", "scripts/db-migrate.cjs", "--env", "production"]

FROM node:22.19.0-bookworm-slim AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package*.json ./
COPY --from=source --chown=node:node /app/src ./src
COPY --from=source --chown=node:node /app/config ./config
COPY --from=source --chown=node:node /app/database ./database
COPY --from=source --chown=node:node /app/migrations ./migrations
COPY --from=source --chown=node:node /app/scripts ./scripts
RUN mkdir -p public/uploads/temp .runtime && chown -R node:node public .runtime
USER node
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=3 CMD ["node", "scripts/healthcheck.cjs", "http://127.0.0.1:5000/health/ready"]
CMD ["node", "src/server.js"]
