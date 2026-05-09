FROM node:20-slim

WORKDIR /app/backend

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7860

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build && npm prune --omit=dev

EXPOSE 7860

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
