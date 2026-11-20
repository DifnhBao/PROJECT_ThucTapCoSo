FROM node:22.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
ARG API_INTERNAL_URL=http://api:5000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm run build

FROM node:22.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/healthcheck.cjs ./scripts/healthcheck.cjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=3 CMD ["node", "scripts/healthcheck.cjs", "http://127.0.0.1:3000/login"]
CMD ["node", "server.js"]
