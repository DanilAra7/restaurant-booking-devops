// In-memory сховище: для модульних тестів і запуску без бази даних
// (npm start без змінної DB_HOST).

const { createStore } = require('../store');
const { normalizePhone } = require('../booking');

const byDateTime = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

function createMemoryRepo(store = createStore()) {
  let queue = Promise.resolve();

  const repo = {
    kind: 'memory',

    async ping() {
      return 'memory';
    },

    async listRestaurants() {
      return store.restaurants.map(({ tables, ...r }) => ({ ...r, tables: tables.length }));
    },

    async getRestaurant(id) {
      return store.restaurants.find((r) => r.id === id) || null;
    },

    async bookingsOn(restaurantId, date) {
      return store.bookings.filter((b) => b.restaurantId === restaurantId && b.date === date);
    },

    async insertBooking(data) {
      const booking = { id: store.nextBookingId++, ...data };
      store.bookings.push(booking);
      return booking;
    },

    async bookingsByPhone(phone) {
      return store.bookings.filter((b) => normalizePhone(b.phone) === phone).sort(byDateTime);
    },

    async deleteBooking(id) {
      const index = store.bookings.findIndex((b) => b.id === id);
      return index === -1 ? null : store.bookings.splice(index, 1)[0];
    },

    // транзакції виконуються по черзі — аналог блокування рядка в PostgreSQL
    transaction(fn) {
      const run = queue.then(() => fn(repo));
      queue = run.catch(() => {});
      return run;
    },

    async close() {},
  };
  return repo;
}

module.exports = { createMemoryRepo };
