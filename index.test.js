const test = require('node:test');
const assert = require('node:assert');
const { sum } = require('./index');

test('sum adds two numbers', () => {
  assert.strictEqual(sum(2, 3), 5);
});
