const test = require('node:test');
const assert = require('node:assert');
const { createStore } = require('../src/store');
const {
  overlaps, findAvailableTables, createBooking, cancelBooking, BookingError,
} = require('../src/booking');

const request = { date: '2026-10-10', time: '19:00', guests: 2 };
const guest = { name: 'Іван', phone: '+380501234567' };

test('overlaps: інтервали ближче ніж 2 години конфліктують', () => {
  assert.strictEqual(overlaps('19:00', '20:59'), true);
  assert.strictEqual(overlaps('19:00', '21:00'), false);
  assert.strictEqual(overlaps('17:30', '19:00'), true);
});

test('findAvailableTables повертає столики від найменшого', () => {
  const store = createStore();
  const tables = findAvailableTables(store, 1, { ...request, guests: 3 });
  assert.deepStrictEqual(tables.map((t) => t.seats), [4, 6]);
});

test('createBooking обирає найменший відповідний столик', () => {
  const store = createStore();
  const booking = createBooking(store, { restaurantId: 1, ...request, ...guest });
  assert.strictEqual(booking.id, 1);
  assert.strictEqual(booking.tableId, 1);
  assert.strictEqual(store.bookings.length, 1);
});

test('один столик не бронюється двічі на перетинний час', () => {
  const store = createStore();
  const first = createBooking(store, { restaurantId: 1, ...request, ...guest });
  const second = createBooking(store, { restaurantId: 1, ...request, time: '20:00', ...guest });
  assert.notStrictEqual(first.tableId, second.tableId);
});

test('коли всі столики зайняті — помилка CONFLICT', () => {
  const store = createStore();
  const big = { restaurantId: 2, date: '2026-10-10', time: '18:00', guests: 8, ...guest };
  createBooking(store, big);
  assert.throws(() => createBooking(store, big), (err) => err instanceof BookingError && err.code === 'CONFLICT');
});

test('бронювання поза годинами роботи відхиляється', () => {
  const store = createStore();
  assert.throws(
    () => createBooking(store, { restaurantId: 1, ...request, time: '22:00', ...guest }),
    (err) => err.code === 'VALIDATION'
  );
});

test('некоректні дані відхиляються', () => {
  const store = createStore();
  const bad = [
    { ...request, date: '10.10.2026' },
    { ...request, time: '7pm' },
    { ...request, guests: 0 },
  ];
  for (const r of bad) {
    assert.throws(() => createBooking(store, { restaurantId: 1, ...r, ...guest }), (err) => err.code === 'VALIDATION');
  }
  assert.throws(() => createBooking(store, { restaurantId: 1, ...request, name: ' ', phone: '1' }), (err) => err.code === 'VALIDATION');
  assert.throws(() => createBooking(store, { restaurantId: 99, ...request, ...guest }), (err) => err.code === 'NOT_FOUND');
});

test('cancelBooking звільняє столик', () => {
  const store = createStore();
  const booking = createBooking(store, { restaurantId: 2, date: '2026-10-10', time: '18:00', guests: 8, ...guest });
  cancelBooking(store, booking.id);
  assert.strictEqual(store.bookings.length, 0);
  assert.throws(() => cancelBooking(store, booking.id), (err) => err.code === 'NOT_FOUND');
});
