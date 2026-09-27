// REST API сервісу бронювання на вбудованому модулі http (без фреймворків).
//
// GET    /health
// GET    /restaurants
// GET    /restaurants/:id/availability?date=YYYY-MM-DD&time=HH:MM&guests=N
// POST   /bookings        { restaurantId, date, time, guests, name, phone }
// DELETE /bookings/:id

const http = require('node:http');
const { createStore } = require('./store');
const booking = require('./booking');

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
        reject(new booking.BookingError('VALIDATION', 'Некоректний JSON'));
      }
    });
    req.on('error', reject);
  });
}

function createApp(store = createStore()) {
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
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { status: 'ok' });
    }
    if (req.method === 'GET' && url.pathname === '/restaurants') {
      const list = store.restaurants.map(({ tables, ...r }) => ({ ...r, tables: tables.length }));
      return send(res, 200, list);
    }
    if (req.method === 'GET' && parts[0] === 'restaurants' && parts[2] === 'availability' && parts.length === 3) {
      const query = Object.fromEntries(url.searchParams);
      const tables = booking.findAvailableTables(store, parts[1], query);
      return send(res, 200, { available: tables.length > 0, tables });
    }
    if (req.method === 'POST' && url.pathname === '/bookings') {
      const created = booking.createBooking(store, await readJson(req));
      return send(res, 201, created);
    }
    if (req.method === 'DELETE' && parts[0] === 'bookings' && parts.length === 2) {
      return send(res, 200, booking.cancelBooking(store, parts[1]));
    }
    return send(res, 404, { error: 'Маршрут не знайдено' });
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = STATUS_BY_CODE[err.code] || 500;
      send(res, status, { error: status === 500 ? 'Внутрішня помилка сервера' : err.message });
    });
  });
}

module.exports = { createApp };
