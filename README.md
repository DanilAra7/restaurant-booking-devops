# restaurant-booking-devops

Індивідуальний проєкт з дисципліни «Основи DevOps» — «Система
онлайн-бронювання столиків у ресторанах» (план етапів — звіт ЛР1):

1. етап 1 (ЛР2) — репозиторій, структура сервісів, ТЗ, гілкова стратегія,
   базовий CI; тут же завдання ЛР2 — розширений конвеєр CI/CD у GitHub Actions;
2. етап 2 (ЛР3) — контейнеризація: Dockerfile для кожного сервісу
   (multi-stage), Docker Compose для локальної розробки, PostgreSQL,
   публікація образів у ghcr.io;
3. етап 3 (ЛР4) — оркестрація: Helm-чарт для Kubernetes (Deployment, Service,
   StatefulSet, Ingress з TLS, HPA), розгортання в Minikube і в kind у CI;
4. етап 4 (ЛР5) — автоматизація тестування (API-тести Postman/Newman, E2E-тести
   Selenium, покриття модульних тестів у CI) та інфраструктура як код
   (Terraform: середовища dev/staging/prod у Kubernetes);
5. етап 5 (ЛР6) — моніторинг (Prometheus, Alertmanager, Grafana), секрети у
   HashiCorp Vault, CD і фінальне розгортання в production плейбуком Ansible.

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
| `tests/api/` | етап 4 — колекція Postman (19 запитів, 38 перевірок) і її генератор |
| `tests/e2e/` | етап 4 — E2E-тести інтерфейсу: Selenium WebDriver + pytest |
| `.github/workflows/tests.yml` | етап 4 — Newman і Selenium проти стека в Docker Compose |
| `infra/terraform/` | етап 4 — Terraform: модуль середовища (namespace, квоти, Helm-реліз), робочі простори dev/staging/prod |
| `deploy/ansible/` | етап 5 — плейбук промислового розгортання: ролі vault, secrets, monitoring, booking_app, verify |
| `.github/workflows/deploy.yml` | етап 5 — CD: ansible-lint, репетиція розгортання в kind, схвалення production, реліз |
| `.github/workflows/infrastructure.yml` | етап 4 — fmt/validate, apply → helm test → plan без змін → destroy у kind |
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

## Автоматизовані тести (етап 4)

```bash
docker compose up -d --build --wait
npx newman run tests/api/booking.postman_collection.json --env-var baseUrl=http://localhost:8080/api
pip install -r tests/e2e/requirements.txt
pytest tests/e2e -v              # E2E_HEADLESS=0 — з видимим вікном Chrome
```

Колекцію Postman генерує `python tests/api/build_collection.py` (її можна
імпортувати в Postman); знімки кроків E2E-тестів — у `tests/e2e/screenshots/`.

## Інфраструктура як код (етап 4)

```bash
cd infra/terraform
terraform init                        # стан — Secret у кластері (backend kubernetes)
terraform workspace new dev           # середовище = робочий простір: dev, staging, prod
terraform apply                       # namespace booking-dev, квоти, Helm-реліз чарта
terraform output url                  # https://dev.booking.local/
terraform destroy
```

Середовища відрізняються лише даними в `infra/terraform/main.tf` (репліки,
HPA, хост Ingress, розмір тому БД, квоти); у робочому просторі `default`
конфігурація навмисно не застосовується.

## Промислове розгортання (етап 5)

```bash
cd deploy/ansible
ansible-playbook -i inventories/production production.yml -e image_tag=<sha>
```

Керуючий вузол потребує kubectl, Helm, Terraform, Ansible і Python-пакета
`kubernetes`. Плейбук встановлює Vault і kube-prometheus-stack, бере паролі з
Vault, розгортає застосунок через Terraform і перевіряє його; повторний запуск
нічого не змінює. Ключ розпечатування Vault зберігається лише на керуючому
вузлі (`VAULT_INIT_FILE`). Адреси: `https://prod.booking.local/`,
`http://grafana.booking.local/`, `http://prometheus.booking.local/`,
`http://alerts.booking.local/`.

## Запуск без Docker

```bash
npm test                 # усі тести репозиторію
cd backend && npm start  # API на http://localhost:3000 (дані в пам'яті)
```

Потім відкрийте `frontend/index.html` у браузері.
