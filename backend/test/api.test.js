const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

test('GET /health', async () => {
  const { status, body } = await call('GET', '/health');
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body, { status: 'ok' });
});

test('GET /restaurants повертає каталог', async () => {
  const { status, body } = await call('GET', '/restaurants');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.length, 2);
  assert.strictEqual(body[0].name, 'Під Липою');
});

test('повний сценарій: доступність → бронювання → скасування', async () => {
  const query = '/restaurants/2/availability?date=2026-10-10&time=19:00&guests=8';
  let res = await call('GET', query);
  assert.strictEqual(res.body.available, true);

  res = await call('POST', '/bookings', {
    restaurantId: 2, date: '2026-10-10', time: '19:00', guests: 8, name: 'Олена', phone: '+380671112233',
  });
  assert.strictEqual(res.status, 201);
  const id = res.body.id;

  res = await call('GET', query);
  assert.strictEqual(res.body.available, false);

  res = await call('DELETE', `/bookings/${id}`);
  assert.strictEqual(res.status, 200);

  res = await call('GET', query);
  assert.strictEqual(res.body.available, true);
});

test('помилки мапляться на HTTP-статуси', async () => {
  assert.strictEqual((await call('GET', '/restaurants/99/availability?date=2026-10-10&time=19:00&guests=2')).status, 404);
  assert.strictEqual((await call('POST', '/bookings', { restaurantId: 1 })).status, 400);
  assert.strictEqual((await call('GET', '/unknown')).status, 404);
});
