// Сценарії сервісу бронювання: поєднують бізнес-правила (booking.js) зі
// сховищем. Сховище — repo/memory.js або repo/postgres.js з однаковим
// асинхронним інтерфейсом.

const { BookingError, validateRequest, validateGuest, freeTables, normalizePhone } = require('./booking');

function parseId(value, what) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new BookingError('NOT_FOUND', `${what} не знайдено`);
  return id;
}

async function loadRestaurant(repo, restaurantId, options) {
  const restaurant = await repo.getRestaurant(parseId(restaurantId, 'Ресторан'), options);
  if (!restaurant) throw new BookingError('NOT_FOUND', 'Ресторан не знайдено');
  return restaurant;
}

function createService(repo) {
  return {
    health: () => repo.ping(),

    listRestaurants: () => repo.listRestaurants(),

    async findAvailableTables(restaurantId, request) {
      const restaurant = await loadRestaurant(repo, restaurantId);
      validateRequest(restaurant, request);
      return freeTables(restaurant, await repo.bookingsOn(restaurant.id, request.date), request);
    },

    async createBooking({ restaurantId, date, time, guests, name, phone }) {
      validateGuest({ name, phone });
      return repo.transaction(async (tx) => {
        // lock: у PostgreSQL рядок ресторану блокується до кінця транзакції,
        // тож два одночасні запити не отримають один і той самий столик
        const restaurant = await loadRestaurant(tx, restaurantId, { lock: true });
        validateRequest(restaurant, { date, time, guests });
        const [table] = freeTables(restaurant, await tx.bookingsOn(restaurant.id, date), { time, guests });
        if (!table) throw new BookingError('CONFLICT', 'На обраний час немає вільних столиків');
        return tx.insertBooking({
          restaurantId: restaurant.id,
          tableId: table.id,
          date,
          time,
          guests: Number(guests),
          name: String(name).trim(),
          phone: String(phone).trim(),
        });
      });
    },

    // історія бронювань гостя за номером телефону, від найближчих
    async findBookingsByPhone(phone) {
      const wanted = normalizePhone(phone);
      if (!wanted) throw new BookingError('VALIDATION', 'Вкажіть номер телефону');
      return repo.bookingsByPhone(wanted);
    },

    async cancelBooking(bookingId) {
      const removed = await repo.deleteBooking(parseId(bookingId, 'Бронювання'));
      if (!removed) throw new BookingError('NOT_FOUND', 'Бронювання не знайдено');
      return removed;
    },
  };
}

module.exports = { createService };
