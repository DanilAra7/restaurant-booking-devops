const test = require('node:test');
const assert = require('node:assert');
const { validateBookingForm } = require('../validation');

const valid = { name: 'Іван', phone: '+38 (050) 123-45-67', guests: '2', date: '2026-10-10', time: '19:00' };

test('коректна форма не має помилок', () => {
  assert.deepStrictEqual(validateBookingForm(valid), []);
});

test('порожня форма повертає всі помилки', () => {
  assert.strictEqual(validateBookingForm({}).length, 5);
});

test('кількість гостей обмежена 1..20', () => {
  assert.strictEqual(validateBookingForm({ ...valid, guests: '0' }).length, 1);
  assert.strictEqual(validateBookingForm({ ...valid, guests: '21' }).length, 1);
  assert.strictEqual(validateBookingForm({ ...valid, guests: '2.5' }).length, 1);
});

test('некоректний телефон відхиляється', () => {
  assert.deepStrictEqual(validateBookingForm({ ...valid, phone: '123' }), ['Некоректний номер телефону']);
});
