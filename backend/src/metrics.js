// Метрики Prometheus (етап 5: моніторинг). Кожен екземпляр застосунку має
// власний реєстр — тести можуть створювати кілька застосунків без конфліктів.
//
//   http_requests_total{method,route,status}       кількість HTTP-запитів
//   http_request_duration_seconds{method,route}     гістограма часу відповіді
//   booking_requests_total{result}                  спроби бронювання: created | conflict | invalid | not_found
//   booking_cancellations_total                     скасовані бронювання
//   booking_process_*, booking_nodejs_*             стан процесу Node.js (пам'ять, CPU, event loop)

const client = require('prom-client');

const BOOKING_RESULT = { 201: 'created', 409: 'conflict', 400: 'invalid', 404: 'not_found' };

// мітка route — шаблон шляху, а не сам шлях: інакше кожен id бронювання
// створював би окремий часовий ряд (вибух кардинальності)
function routeOf(method, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (pathname === '/health' || pathname === '/health/live' || pathname === '/restaurants' || pathname === '/bookings') return pathname;
  if (parts[0] === 'restaurants' && parts[2] === 'availability' && parts.length === 3) return '/restaurants/:id/availability';
  if (parts[0] === 'bookings' && parts.length === 2) return '/bookings/:id';
  return 'unmatched';
}

function createMetrics() {
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry, prefix: 'booking_' });

  const requests = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by method, route and status code',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
  });
  const duration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });
  const bookings = new client.Counter({
    name: 'booking_requests_total',
    help: 'Booking attempts by result',
    labelNames: ['result'],
    registers: [registry],
  });
  const cancellations = new client.Counter({
    name: 'booking_cancellations_total',
    help: 'Cancelled bookings',
    registers: [registry],
  });
  // ряди з нульовими значеннями — щоб rate() і правила сповіщень працювали з першого скрейпу
  for (const result of Object.values(BOOKING_RESULT)) bookings.inc({ result }, 0);

  // викликається для кожного запиту після відправлення відповіді
  function observe(method, pathname, status, seconds) {
    const route = routeOf(method, pathname);
    requests.inc({ method, route, status: String(status) });
    duration.observe({ method, route }, seconds);
    if (method === 'POST' && route === '/bookings' && BOOKING_RESULT[status]) bookings.inc({ result: BOOKING_RESULT[status] });
    if (method === 'DELETE' && route === '/bookings/:id' && status === 200) cancellations.inc();
  }

  return { registry, observe };
}

module.exports = { createMetrics, routeOf };
