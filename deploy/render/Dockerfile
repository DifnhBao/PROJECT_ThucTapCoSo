FROM node:22.19.0-bookworm-slim AS api-dependencies
WORKDIR /app
COPY Server/package.json Server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.19.0-bookworm-slim AS web-build
WORKDIR /app
COPY UI/package.json UI/package-lock.json ./
RUN npm ci && npm cache clean --force
COPY UI/ ./
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=http://127.0.0.1:5000
RUN npm run build

FROM node:22.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=10000 NODE_OPTIONS=--max-old-space-size=160
WORKDIR /app
COPY --from=api-dependencies --chown=node:node /app/node_modules ./api/node_modules
COPY --from=api-dependencies --chown=node:node /app/package*.json ./api/
COPY --chown=node:node Server/src ./api/src
COPY --chown=node:node Server/config ./api/config
COPY --chown=node:node Server/database ./api/database
COPY --chown=node:node Server/migrations ./api/migrations
COPY --chown=node:node Server/scripts ./api/scripts
COPY --from=web-build --chown=node:node /app/.next/standalone ./web/
COPY --from=web-build --chown=node:node /app/.next/static ./web/.next/static
COPY --from=web-build --chown=node:node /app/public ./web/public
COPY --chown=node:node scripts/deploy/start-demo.cjs ./start-demo.cjs
RUN mkdir -p api/public/uploads/temp api/.runtime && chown -R node:node api/public api/.runtime
USER node
EXPOSE 10000
CMD ["node", "start-demo.cjs"]
