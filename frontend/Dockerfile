# booking-frontend — багатоетапна збірка (multi-stage build).
#
# Етап build: тести валідації форми та перевірка синтаксису на Node.js; у dist/
# потрапляють лише файли, потрібні браузеру.
FROM node:20-alpine AS build
WORKDIR /src
COPY . .
RUN npm run lint && npm test \
 && mkdir dist && cp index.html style.css app.js validation.js dist/

# Етап runtime: Nginx зі статикою — без Node.js, тестів і package.json.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
