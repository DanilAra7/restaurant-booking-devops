const test = require('node:test');
const assert = require('node:assert');
const { overlaps, validateRequest, todayInKyiv } = require('../src/booking');
const { createService } = require('../src/service');
const { createMemoryRepo } = require('../src/repo/memory');

const request = { date: '2030-10-10', time: '19:00', guests: 2 };
const guest = { name: 'Іван', phone: '+380501234567' };
const fresh = () => createService(createMemoryRepo());
const code = (expected) => (err) => err.code === expected;

test('overlaps: інтервали ближче ніж 2 години конфліктують', () => {
  assert.strictEqual(overlaps('19:00', '20:59'), true);
  assert.strictEqual(overlaps('19:00', '21:00'), false);
  assert.strictEqual(overlaps('17:30', '19:00'), true);
});

test('дата в минулому відхиляється, сьогоднішня — ні', () => {
  const restaurant = { opens: '10:00', closes: '23:00' };
  const at = (date) => () => validateRequest(restaurant, { date, time: '19:00', guests: 2 }, '2030-05-10');
  assert.throws(at('2030-05-09'), /минулу дату/);
  assert.doesNotThrow(at('2030-05-10'));
  assert.doesNotThrow(at('2030-05-11'));
});

test('todayInKyiv рахує дату за київським часом, а не UTC', () => {
  // 22:30 UTC 31 грудня — у Києві (UTC+2) вже 1 січня
  assert.strictEqual(todayInKyiv(new Date('2030-12-31T22:30:00Z')), '2031-01-01');
  assert.strictEqual(todayInKyiv(new Date('2030-07-01T12:00:00Z')), '2030-07-01');
});

test('findAvailableTables повертає столики від найменшого', async () => {
  const tables = await fresh().findAvailableTables(1, { ...request, guests: 3 });
  assert.deepStrictEqual(tables.map((t) => t.seats), [4, 6]);
});

test('createBooking обирає найменший відповідний столик', async () => {
  const service = fresh();
  const booking = await service.createBooking({ restaurantId: 1, ...request, ...guest });
  assert.strictEqual(booking.id, 1);
  assert.strictEqual(booking.tableId, 1);
  assert.strictEqual((await service.findBookingsByPhone(guest.phone)).length, 1);
});

test('один столик не бронюється двічі на перетинний час, навіть паралельно', async () => {
  const service = fresh();
  const [first, second] = await Promise.all([
    service.createBooking({ restaurantId: 1, ...request, ...guest }),
    service.createBooking({ restaurantId: 1, ...request, time: '20:00', ...guest }),
  ]);
  assert.notStrictEqual(first.tableId, second.tableId);
});

test('коли всі столики зайняті — помилка CONFLICT', async () => {
  const service = fresh();
  const big = { restaurantId: 2, date: '2030-10-10', time: '18:00', guests: 8, ...guest };
  await service.createBooking(big);
  await assert.rejects(service.createBooking(big), code('CONFLICT'));
});

test('бронювання поза годинами роботи відхиляється', async () => {
  await assert.rejects(
    fresh().createBooking({ restaurantId: 1, ...request, time: '22:00', ...guest }),
    code('VALIDATION')
  );
});

test('некоректні дані відхиляються', async () => {
  const service = fresh();
  const bad = [
    { ...request, date: '10.10.2026' },
    { ...request, date: '2030-02-30' },
    { ...request, time: '7pm' },
    { ...request, guests: 0 },
  ];
  for (const r of bad) {
    await assert.rejects(service.createBooking({ restaurantId: 1, ...r, ...guest }), code('VALIDATION'));
  }
  await assert.rejects(service.createBooking({ restaurantId: 1, ...request, name: ' ', phone: '1' }), code('VALIDATION'));
  await assert.rejects(service.createBooking({ restaurantId: 99, ...request, ...guest }), code('NOT_FOUND'));
  await assert.rejects(service.createBooking({ restaurantId: 'abc', ...request, ...guest }), code('NOT_FOUND'));
});

test('findBookingsByPhone повертає історію гостя в хронологічному порядку', async () => {
  const service = fresh();
  await service.createBooking({ restaurantId: 1, ...request, date: '2030-10-12', ...guest });
  await service.createBooking({ restaurantId: 2, date: '2030-10-11', time: '18:00', guests: 2, ...guest });
  await service.createBooking({ restaurantId: 1, ...request, name: 'Інший', phone: '+380999999999' });

  const history = await service.findBookingsByPhone('+38 (050) 123-45-67');
  assert.deepStrictEqual(history.map((b) => b.date), ['2030-10-11', '2030-10-12']);
  await assert.rejects(service.findBookingsByPhone(''), code('VALIDATION'));
});

test('cancelBooking звільняє столик', async () => {
  const service = fresh();
  const big = { restaurantId: 2, date: '2030-10-10', time: '18:00', guests: 8 };
  const booking = await service.createBooking({ ...big, ...guest });
  await service.cancelBooking(booking.id);
  assert.strictEqual((await service.findAvailableTables(2, big)).length, 1);
  await assert.rejects(service.cancelBooking(booking.id), code('NOT_FOUND'));
});
