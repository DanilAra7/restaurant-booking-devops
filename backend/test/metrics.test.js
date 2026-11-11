const { test } = require('node:test');
const assert = require('node:assert');
const { createApp, createMetricsServer } = require('../src/app');
const { routeOf } = require('../src/metrics');

test('routeOf: шаблон шляху замість id (обмежена кардинальність міток)', () => {
  assert.strictEqual(routeOf('GET', '/restaurants/2/availability'), '/restaurants/:id/availability');
  assert.strictEqual(routeOf('DELETE', '/bookings/17'), '/bookings/:id');
  assert.strictEqual(routeOf('GET', '/whatever/1/2'), 'unmatched');
});

test('/metrics рахує запити, бронювання та скасування', async () => {
  const app = createApp();
  const metricsServer = createMetricsServer(app.metrics);
  await new Promise((r) => app.listen(0, r));
  await new Promise((r) => metricsServer.listen(0, r));
  const base = `http://127.0.0.1:${app.address().port}`;
  const post = (body) => fetch(`${base}/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    await fetch(`${base}/restaurants`);
    const big = { restaurantId: 2, date: '2030-03-01', time: '18:00', guests: 8, name: 'М', phone: '+380501112233' };
    const created = await (await post(big)).json();
    await post(big); // 409 — єдиний столик на 8 гостей уже зайнятий
    await post({ ...big, guests: 0 }); // 400
    await fetch(`${base}/bookings/${created.id}`, { method: 'DELETE' });

    const text = await (await fetch(`http://127.0.0.1:${metricsServer.address().port}/metrics`)).text();
    assert.match(text, /http_requests_total\{method="GET",route="\/restaurants",status="200"\} 1/);
    assert.match(text, /booking_requests_total\{result="created"\} 1/);
    assert.match(text, /booking_requests_total\{result="conflict"\} 1/);
    assert.match(text, /booking_requests_total\{result="invalid"\} 1/);
    assert.match(text, /booking_cancellations_total 1/);
    assert.match(text, /http_request_duration_seconds_bucket\{le="0.005",method="POST",route="\/bookings"\}/);
    assert.match(text, /booking_process_resident_memory_bytes/);
  } finally {
    app.close();
    metricsServer.close();
  }
});
