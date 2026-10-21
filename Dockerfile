# syntax=docker/dockerfile:1

# --- Dependencies -----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=9000
WORKDIR /app

# Run as the unprivileged user shipped with the base image.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json express.js ./
COPY --chown=node:node api ./api
COPY --chown=node:node src ./src
COPY --chown=node:node themes ./themes

USER node
EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||9000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "express.js"]
