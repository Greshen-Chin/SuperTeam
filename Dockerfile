FROM node:20-slim

WORKDIR /app/backend

ENV HOST=0.0.0.0
ENV PORT=7860

COPY backend/package*.json ./
RUN npm ci --include=dev

COPY backend/ ./
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 7860

CMD ["sh", "-c", "node dist/scripts/migrate-db.js && node dist/server.js"]
