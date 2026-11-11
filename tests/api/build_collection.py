"""Генерує booking.postman_collection.json (Postman Collection v2.1).

Колекцію зручніше підтримувати тут, ніж редагувати великий JSON вручну:
    python tests/api/build_collection.py
Згенерований JSON імпортується в Postman і запускається через Newman.
"""
import json
import pathlib


def lines(text):
    return text.strip("\n").split("\n")


def req(name, method, path, tests, body=None, raw_body=None):
    path_part, _, query = path.partition("?")
    url = {"raw": "{{baseUrl}}" + path, "host": ["{{baseUrl}}"], "path": [p for p in path_part.split("/") if p]}
    if query:
        url["query"] = [dict(zip(("key", "value"), kv.split("=", 1))) for kv in query.split("&")]
    request = {"method": method, "header": [], "url": url}
    if body is not None or raw_body is not None:
        request["header"] = [{"key": "Content-Type", "value": "application/json"}]
        request["body"] = {"mode": "raw", "raw": raw_body if raw_body is not None else json.dumps(body, ensure_ascii=False, indent=2)}
    return {
        "name": name,
        "request": request,
        "event": [{"listen": "test", "script": {"type": "text/javascript", "exec": lines(tests)}}],
    }


def folder(name, items):
    return {"name": name, "item": items}


def booking(**kw):
    base = {"restaurantId": "{{restaurantId}}", "date": "{{date}}", "time": "19:00", "guests": 2,
            "name": "Newman", "phone": "{{phone}}"}
    base.update(kw)
    return base


def status(code):
    return f'pm.test("HTTP {code}", () => pm.response.to.have.status({code}));'


def error_has(text):
    return f'pm.test("повідомлення: {text}", () => pm.expect(pm.response.json().error).to.include("{text}"));'


JSON_CT = 'pm.test("відповідь у JSON", () => pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json"));'

PREREQUEST = """
// Один раз на запуск: випадкова майбутня дата й телефон, щоб повторні запуски
// на тій самій базі даних не конфліктували між собою.
if (!pm.collectionVariables.get("date")) {
  const pad = (n) => String(n).padStart(2, "0");
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  pm.collectionVariables.set("date", `${rnd(2031, 2039)}-${pad(rnd(1, 12))}-${pad(rnd(1, 28))}`);
  pm.collectionVariables.set("phone", "+38050" + rnd(1000000, 9999999));
  // «+» у рядку запиту означає пробіл, тому для URL телефон кодується
  pm.collectionVariables.set("phoneQuery", encodeURIComponent(pm.collectionVariables.get("phone")));
  pm.collectionVariables.set("yesterday", new Date(Date.now() - 86400000).toISOString().slice(0, 10));
}
"""

collection = {
    "info": {
        "name": "Restaurant booking API",
        "description": "API-тести сервісу бронювання (етап 4 індивідуального проєкту). Запуск: "
                       "npx newman run tests/api/booking.postman_collection.json --env-var baseUrl=http://localhost:8080/api",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:8080/api"},
        {"key": "restaurantId", "value": "1"},
    ],
    "event": [{"listen": "prerequest", "script": {"type": "text/javascript", "exec": lines(PREREQUEST)}}],
    "item": [
        folder("1. Стан сервісу та каталог", [
            req("Health: сервіс і база даних готові", "GET", "/health", f"""
{status(200)}
{JSON_CT}
pm.test("сховище — PostgreSQL", () => pm.expect(pm.response.json()).to.eql({{ status: "ok", storage: "postgres" }}));
pm.test("час відповіді < 1 с", () => pm.expect(pm.response.responseTime).to.be.below(1000));
"""),
            req("Каталог ресторанів", "GET", "/restaurants", f"""
{status(200)}
const list = pm.response.json();
pm.test("щонайменше 2 ресторани", () => pm.expect(list).to.be.an("array").with.length.at.least(2));
pm.test("у кожного ресторану є id, назва й години роботи", () => list.forEach((r) => {{
  pm.expect(r).to.include.keys("id", "name", "opens", "closes");
  pm.expect(r.opens).to.match(/^\\d{{2}}:\\d{{2}}$/);
}}));
"""),
        ]),
        folder("2. Основний сценарій бронювання", [
            req("Перевірка наявності столика", "GET",
                "/restaurants/{{restaurantId}}/availability?date={{date}}&time=19:00&guests=2", f"""
{status(200)}
pm.test("є вільний столик", () => pm.expect(pm.response.json().available).to.be.true);
"""),
            req("Створення бронювання", "POST", "/bookings", f"""
{status(201)}
const b = pm.response.json();
pm.test("повернуто номер бронювання і столик", () => {{
  pm.expect(b.id).to.be.a("number");
  pm.expect(b.tableId).to.be.a("number");
}});
pm.test("збережено дату, час і кількість гостей", () =>
  pm.expect(b).to.include({{ date: pm.collectionVariables.get("date"), time: "19:00", guests: 2 }}));
pm.collectionVariables.set("bookingId", b.id);
""", body=booking()),
            req("Історія бронювань гостя", "GET", "/bookings?phone={{phoneQuery}}", f"""
{status(200)}
const id = Number(pm.collectionVariables.get("bookingId"));
pm.test("нове бронювання є в історії", () => pm.expect(pm.response.json().map((b) => b.id)).to.include(id));
"""),
        ]),
        folder("3. Бізнес-правила", [
            req("Єдиний столик на 8 гостей: перше бронювання", "POST", "/bookings", f"""
{status(201)}
pm.collectionVariables.set("bigBookingId", pm.response.json().id);
""", body=booking(restaurantId=2, guests=8, time="17:00")),
            req("Той самий столик через годину: конфлікт 409", "POST", "/bookings", f"""
{status(409)}
{error_has("немає вільних столиків")}
""", body=booking(restaurantId=2, guests=8, time="18:00")),
            req("Через 2 години столик знову вільний", "GET",
                "/restaurants/2/availability?date={{date}}&time=19:00&guests=8", f"""
{status(200)}
pm.test("доступний", () => pm.expect(pm.response.json().available).to.be.true);
"""),
        ]),
        folder("4. Валідація запитів", [
            req("Неіснуюча дата 30 лютого: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("YYYY-MM-DD")}
""", body=booking(date="2031-02-30")),
            req("Дата в минулому: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("минулу дату")}
""", body=booking(date="{{yesterday}}")),
            req("0 гостей: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("Кількість гостей")}
""", body=booking(guests=0)),
            req("Час до відкриття ресторану: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("Бронювання можливе з 10:00")}
""", body=booking(time="09:00")),
            req("Порожнє ім'я: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("Ім'я гостя")}
""", body=booking(name="  ")),
            req("Некоректний JSON: 400", "POST", "/bookings", f"""
{status(400)}
{error_has("JSON")}
""", raw_body='{"restaurantId": 1,'),
            req("Неіснуючий ресторан: 404", "GET",
                "/restaurants/999/availability?date={{date}}&time=19:00&guests=2", f"""
{status(404)}
{error_has("Ресторан не знайдено")}
"""),
            req("Невідомий маршрут: 404", "GET", "/unknown", status(404)),
        ]),
        folder("5. Скасування", [
            req("Скасування бронювання", "DELETE", "/bookings/{{bookingId}}", f"""
{status(200)}
pm.test("скасовано саме це бронювання", () =>
  pm.expect(pm.response.json().id).to.eql(Number(pm.collectionVariables.get("bookingId"))));
"""),
            req("Повторне скасування: 404", "DELETE", "/bookings/{{bookingId}}", status(404)),
            req("Скасування бронювання на 8 гостей", "DELETE", "/bookings/{{bigBookingId}}", status(200)),
        ]),
    ],
}

out = pathlib.Path(__file__).with_name("booking.postman_collection.json")
# newline="\n": LF і на Windows — CI порівнює згенерований файл через git diff
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(json.dumps(collection, ensure_ascii=False, indent=2) + "\n")
print(f"written {out.name}: {sum(len(f['item']) for f in collection['item'])} requests")
