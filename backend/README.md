# booking-service

REST API бронювання столиків. Node.js ≥ 18, єдина залежність — драйвер `pg`.

```bash
npm ci
npm start   # http://localhost:3000 (порт — змінна PORT), дані в пам'яті
npm test    # модульні та API-тести (node:test, in-memory сховище)
```

Сховище обирається змінними середовища: якщо задано `DB_HOST`, сервіс працює
з PostgreSQL (`DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), інакше — з
in-memory сховищем. Схема й початкові дані БД — `db/init.sql`. У Docker
Compose сервіс запускається разом з БД (див. кореневий `docker-compose.yml`).

| Модуль | Призначення |
| --- | --- |
| `src/booking.js` | бізнес-правила (чисті функції) |
| `src/service.js` | сценарії: доступність, бронювання, історія, скасування |
| `src/repo/memory.js`, `src/repo/postgres.js` | сховища з однаковим інтерфейсом |
| `src/app.js`, `src/server.js` | HTTP API, вибір сховища, коректне завершення за SIGTERM |

`Dockerfile` — багатоетапний: етап build встановлює залежності й проганяє
lint і тести (якщо вони впали, образ не збирається), етап runtime містить лише
production-залежності та `src/`, працює від користувача `node` і має
HEALTHCHECK на `/health`.

| Метод | Шлях | Опис |
| --- | --- | --- |
| GET | `/health` | готовність: стан сервісу й сховища (503, якщо БД недоступна) |
| GET | `/health/live` | процес живий (для livenessProbe; від БД не залежить) |
| GET | `/restaurants` | каталог ресторанів |
| GET | `/restaurants/:id/availability?date&time&guests` | вільні столики |
| GET | `/bookings?phone=` | історія бронювань гостя |
| POST | `/bookings` | нове бронювання |
| DELETE | `/bookings/:id` | скасування |

Помилки: 400 — некоректні дані, 404 — не знайдено, 409 — немає вільних столиків.
