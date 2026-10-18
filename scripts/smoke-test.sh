#!/usr/bin/env bash
# Димовий тест розгорнутого стека: запити йдуть через Nginx (frontend) до
# booking-service і PostgreSQL. Використовується в CI і локально:
#   docker compose up -d --build --wait && ./scripts/smoke-test.sh
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
DATE="${SMOKE_DATE:-2030-01-15}"
PHONE="+380500000001"

fail() { echo "FAIL: $*" >&2; exit 1; }
# curl з перевіркою очікуваного HTTP-коду; тіло відповіді — у stdout
call() {
  local expected=$1; shift
  local out code
  out=$(curl -sS -w '\n%{http_code}' "$@")
  code=${out##*$'\n'}
  [ "$code" = "$expected" ] || fail "$* → HTTP $code, очікувався $expected: ${out%$'\n'*}"
  printf '%s' "${out%$'\n'*}"
}

# перевірка підрядка без grep -q: grep закриває канал раніше, і з pipefail це помилка
contains() { case "$1" in *"$2"*) ;; *) fail "$3" ;; esac; }

echo "1. Веб-інтерфейс"
contains "$(call 200 "$BASE/")" 'id="booking-form"' "сторінка без форми бронювання"

echo "2. Health через проксі: сервіс і база даних готові"
contains "$(call 200 "$BASE/api/health")" '"storage":"postgres"' "сховище не postgres"

echo "3. Каталог ресторанів з бази даних"
contains "$(call 200 "$BASE/api/restaurants")" 'Trattoria Roma' "немає ресторанів"

echo "4. Бронювання єдиного столика на 8 гостей"
booking=$(call 201 -X POST "$BASE/api/bookings" -H 'Content-Type: application/json' \
  -d "{\"restaurantId\":2,\"date\":\"$DATE\",\"time\":\"19:00\",\"guests\":8,\"name\":\"Smoke\",\"phone\":\"$PHONE\"}")
id=$(printf '%s' "$booking" | sed -E 's/.*"id":([0-9]+).*/\1/')
echo "   створено бронювання №$id"

echo "5. Повторне бронювання на той самий час — 409"
call 409 -X POST "$BASE/api/bookings" -H 'Content-Type: application/json' \
  -d "{\"restaurantId\":2,\"date\":\"$DATE\",\"time\":\"20:00\",\"guests\":8,\"name\":\"Smoke\",\"phone\":\"$PHONE\"}" > /dev/null

echo "6. Історія гостя"
contains "$(call 200 "$BASE/api/bookings?phone=%2B380500000001")" "\"id\":$id," "бронювання немає в історії"

echo "7. Скасування"
call 200 -X DELETE "$BASE/api/bookings/$id" > /dev/null
call 404 -X DELETE "$BASE/api/bookings/$id" > /dev/null

echo "OK: smoke test passed"
