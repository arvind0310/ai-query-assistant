# syntax=docker/dockerfile:1

# ---- deps: install production dependencies only, from the lockfile ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime: small image, non-root user, no build tooling ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node app.js server.js ./
COPY --chown=node:node src ./src

# The official image ships an unprivileged "node" user.
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

# Run node directly (not via npm) so SIGTERM reaches the process for graceful shutdown.
# Secrets (ANTHROPIC_API_KEY, JWT_SECRET) are injected at runtime, never baked into the image.
CMD ["node", "server.js"]
