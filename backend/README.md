# booking-service

REST API бронювання столиків (етап 1). Без зовнішніх залежностей, Node.js ≥ 18.

```bash
npm start   # http://localhost:3000 (порт — змінна PORT)
npm test    # модульні та API-тести (node:test)
```

| Метод | Шлях | Опис |
| --- | --- | --- |
| GET | `/health` | перевірка стану (для моніторингу / Kubernetes probes) |
| GET | `/restaurants` | каталог ресторанів |
| GET | `/restaurants/:id/availability?date&time&guests` | вільні столики |
| GET | `/bookings?phone=` | історія бронювань гостя |
| POST | `/bookings` | нове бронювання |
| DELETE | `/bookings/:id` | скасування |

Помилки: 400 — некоректні дані, 404 — не знайдено, 409 — немає вільних столиків.
