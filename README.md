# restaurant-booking-devops

Лабораторна робота №2 з дисципліни «Основи DevOps» — розширений конвеєр
CI/CD у GitHub Actions, та етап 1 індивідуального проєкту «Система
онлайн-бронювання столиків у ресторанах».

## Структура

| Шлях | Вміст |
| --- | --- |
| `index.js`, `index.test.js`, `Dockerfile` | навчальний застосунок із завдання 1 |
| `.github/workflows/production-pipeline.yml` | 1.1 — test → build (ghcr.io) → staging → production |
| `.github/workflows/matrix.yml` | 1.2 — матриця 3 ОС × 3 версії Node.js − 1 = 8 завдань |
| `.github/workflows/deploy-template.yml`, `call-deploy.yml` | 1.3 — reusable workflow |
| `.github/workflows/conditional.yml` | 1.4 — завдання залежно від змінених файлів |
| `.github/workflows/booking-ci.yml` | базовий CI індивідуального проєкту |
| `backend/` | booking-service (REST API бронювання) |
| `frontend/` | веб-інтерфейс бронювання |
| `docs/` | ТЗ та гілкова стратегія |

## Локальний запуск

```bash
npm test                 # усі тести репозиторію
cd backend && npm start  # API на http://localhost:3000
```

Потім відкрийте `frontend/index.html` у браузері.
