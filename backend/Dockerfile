# booking-service — багатоетапна збірка (multi-stage build).
#
# Етап build: встановлює залежності, перевіряє синтаксис і проганяє тести —
# якщо тести впали, образ не збереться. Потім прибирає dev-залежності.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && npm prune --omit=dev

# Етап runtime: лише production-залежності й вихідний код — без тестів,
# кешу npm і файлів збірки. Процес працює від непривілейованого користувача.
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
USER node
EXPOSE 3000
# /health відповідає 503, поки недоступна база даних
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
