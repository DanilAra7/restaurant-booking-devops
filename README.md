# restaurant-booking-devops

Індивідуальний проєкт з дисципліни «Основи DevOps» — «Система
онлайн-бронювання столиків у ресторанах» (план етапів — звіт ЛР1):

1. етап 1 (ЛР2) — репозиторій, структура сервісів, ТЗ, гілкова стратегія,
   базовий CI; тут же завдання ЛР2 — розширений конвеєр CI/CD у GitHub Actions;
2. етап 2 (ЛР3) — контейнеризація: Dockerfile для кожного сервісу
   (multi-stage), Docker Compose для локальної розробки, PostgreSQL,
   публікація образів у ghcr.io;
3. етап 3 (ЛР4) — оркестрація: Helm-чарт для Kubernetes (Deployment, Service,
   StatefulSet, Ingress з TLS, HPA), розгортання в Minikube і в kind у CI.

## Структура

| Шлях | Вміст |
| --- | --- |
| `index.js`, `index.test.js`, `Dockerfile` | навчальний застосунок із завдання 1 |
| `.github/workflows/production-pipeline.yml` | 1.1 — test → build (ghcr.io) → staging → production |
| `.github/workflows/matrix.yml` | 1.2 — матриця 3 ОС × 3 версії Node.js − 1 = 8 завдань |
| `.github/workflows/deploy-template.yml`, `call-deploy.yml` | 1.3 — reusable workflow |
| `.github/workflows/conditional.yml` | 1.4 — завдання залежно від змінених файлів |
| `.github/workflows/booking-ci.yml` | базовий CI індивідуального проєкту |
| `.github/workflows/containers.yml` | етап 2 — збірка образів, тест стека в Compose, публікація в ghcr.io |
| `backend/` | booking-service (REST API бронювання, PostgreSQL), `Dockerfile`, `db/init.sql` |
| `frontend/` | веб-інтерфейс бронювання, `nginx.conf`, `Dockerfile` |
| `docker-compose.yml` | локальне середовище: db + booking-service + frontend |
| `deploy/helm/restaurant-booking/` | Helm-чарт для Kubernetes (етап 3) |
| `.github/workflows/kubernetes.yml` | етап 3 — lint чарта, розгортання в kind, helm test, димовий тест |
| `scripts/smoke-test.sh` | димовий тест розгорнутого стека |
| `docs/` | ТЗ та гілкова стратегія |

## Запуск у Docker (етап 2)

```bash
docker compose up -d --build --wait   # зібрати образи й дочекатися готовності
./scripts/smoke-test.sh               # перевірити стек через Nginx
docker compose down                   # зупинити (дані лишаються в томі booking_data)
docker compose down -v                # зупинити й видалити дані
```

Веб-інтерфейс — http://localhost:8080, API — http://localhost:8080/api/.
Готові образи з реєстру замість локальної збірки:
`TAG=main docker compose pull && TAG=main docker compose up -d --no-build`.
Паролі БД за замовчуванням — лише для локальної розробки; інші значення
задаються у `.env` (зразок — `.env.example`).

## Розгортання в Kubernetes (етап 3)

```bash
minikube start --cpus=4 --memory=4096
minikube addons enable ingress
minikube addons enable metrics-server
helm install booking deploy/helm/restaurant-booking   # образи :main з ghcr.io
helm test booking
kubectl get pods,svc,hpa,ingress
```

Ingress обслуговує `https://booking.local/` (веб-інтерфейс) і
`https://booking.local/api/` (API) із самопідписаним сертифікатом. На minikube
з драйвером docker у Windows потрібен `minikube tunnel` і запис
`127.0.0.1 booking.local` у файлі hosts. Тег образів для відтворюваного
розгортання — `--set image.tag=<sha коміту>`.

## Запуск без Docker

```bash
npm test                 # усі тести репозиторію
cd backend && npm start  # API на http://localhost:3000 (дані в пам'яті)
```

Потім відкрийте `frontend/index.html` у браузері.
