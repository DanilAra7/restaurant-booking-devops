// REST API сервісу бронювання на вбудованому модулі http (без фреймворків).
//
// GET    /health
// GET    /restaurants
// GET    /restaurants/:id/availability?date=YYYY-MM-DD&time=HH:MM&guests=N
// GET    /bookings?phone=+380...
// POST   /bookings        { restaurantId, date, time, guests, name, phone }
// DELETE /bookings/:id

const http = require('node:http');
const { BookingError } = require('./booking');
const { createService } = require('./service');
const { createMemoryRepo } = require('./repo/memory');

const STATUS_BY_CODE = { VALIDATION: 400, NOT_FOUND: 404, CONFLICT: 409 };

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new BookingError('VALIDATION', 'Некоректний JSON'));
      }
    });
    req.on('error', reject);
  });
}

function createApp(repo = createMemoryRepo()) {
  const service = createService(repo);

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }
    // health перевіряє і сховище: без БД сервіс не готовий (503) — на це
    // орієнтуються healthcheck у Docker і depends_on: service_healthy
    if (req.method === 'GET' && url.pathname === '/health') {
      try {
        return send(res, 200, { status: 'ok', storage: await service.health() });
      } catch {
        return send(res, 503, { status: 'unavailable', storage: repo.kind });
      }
    }
    if (req.method === 'GET' && url.pathname === '/restaurants') {
      return send(res, 200, await service.listRestaurants());
    }
    if (req.method === 'GET' && parts[0] === 'restaurants' && parts[2] === 'availability' && parts.length === 3) {
      const query = Object.fromEntries(url.searchParams);
      const tables = await service.findAvailableTables(parts[1], query);
      return send(res, 200, { available: tables.length > 0, tables });
    }
    if (req.method === 'GET' && url.pathname === '/bookings') {
      return send(res, 200, await service.findBookingsByPhone(url.searchParams.get('phone')));
    }
    if (req.method === 'POST' && url.pathname === '/bookings') {
      return send(res, 201, await service.createBooking(await readJson(req)));
    }
    if (req.method === 'DELETE' && parts[0] === 'bookings' && parts.length === 2) {
      return send(res, 200, await service.cancelBooking(parts[1]));
    }
    return send(res, 404, { error: 'Маршрут не знайдено' });
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = STATUS_BY_CODE[err.code] || 500;
      if (status === 500) console.error(err);
      send(res, status, { error: status === 500 ? 'Внутрішня помилка сервера' : err.message });
    });
  });
}

module.exports = { createApp };
