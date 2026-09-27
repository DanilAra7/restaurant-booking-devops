// Бізнес-логіка бронювання столиків (без залежності від HTTP), щоб її можна
// було покрити модульними тестами.

const BOOKING_MINUTES = 120; // тривалість одного бронювання

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// два бронювання конфліктують, якщо їхні двогодинні інтервали перетинаються
function overlaps(timeA, timeB) {
  return Math.abs(toMinutes(timeA) - toMinutes(timeB)) < BOOKING_MINUTES;
}

function findRestaurant(store, restaurantId) {
  const restaurant = store.restaurants.find((r) => r.id === Number(restaurantId));
  if (!restaurant) throw new BookingError('NOT_FOUND', 'Ресторан не знайдено');
  return restaurant;
}

function validateRequest(restaurant, { date, time, guests }) {
  if (!DATE_RE.test(String(date))) throw new BookingError('VALIDATION', 'Дата має бути у форматі YYYY-MM-DD');
  if (!TIME_RE.test(String(time))) throw new BookingError('VALIDATION', 'Час має бути у форматі HH:MM');
  const n = Number(guests);
  if (!Number.isInteger(n) || n < 1) throw new BookingError('VALIDATION', 'Кількість гостей має бути цілим числом від 1');
  const start = toMinutes(time);
  if (start < toMinutes(restaurant.opens) || start + BOOKING_MINUTES > toMinutes(restaurant.closes)) {
    throw new BookingError('VALIDATION', `Бронювання можливе з ${restaurant.opens} і має завершитися до ${restaurant.closes}`);
  }
}

// вільні столики, що вміщують гостей, від найменшого до найбільшого
function findAvailableTables(store, restaurantId, { date, time, guests }) {
  const restaurant = findRestaurant(store, restaurantId);
  validateRequest(restaurant, { date, time, guests });
  const busy = new Set(
    store.bookings
      .filter((b) => b.restaurantId === restaurant.id && b.date === date && overlaps(b.time, time))
      .map((b) => b.tableId)
  );
  return restaurant.tables
    .filter((t) => t.seats >= Number(guests) && !busy.has(t.id))
    .sort((a, b) => a.seats - b.seats);
}

function createBooking(store, { restaurantId, date, time, guests, name, phone }) {
  if (!name || !String(name).trim()) throw new BookingError('VALIDATION', "Ім'я гостя обов'язкове");
  if (!phone || !String(phone).trim()) throw new BookingError('VALIDATION', "Телефон обов'язковий");
  const [table] = findAvailableTables(store, restaurantId, { date, time, guests });
  if (!table) throw new BookingError('CONFLICT', 'На обраний час немає вільних столиків');

  const booking = {
    id: store.nextBookingId++,
    restaurantId: Number(restaurantId),
    tableId: table.id,
    date,
    time,
    guests: Number(guests),
    name: String(name).trim(),
    phone: String(phone).trim(),
  };
  store.bookings.push(booking);
  return booking;
}

const normalizePhone = (phone) => String(phone || '').replace(/[^\d+]/g, '');

// історія бронювань гостя за номером телефону, від найближчих
function findBookingsByPhone(store, phone) {
  const wanted = normalizePhone(phone);
  if (!wanted) throw new BookingError('VALIDATION', 'Вкажіть номер телефону');
  return store.bookings
    .filter((b) => normalizePhone(b.phone) === wanted)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function cancelBooking(store, bookingId) {
  const index = store.bookings.findIndex((b) => b.id === Number(bookingId));
  if (index === -1) throw new BookingError('NOT_FOUND', 'Бронювання не знайдено');
  return store.bookings.splice(index, 1)[0];
}

module.exports = {
  BOOKING_MINUTES,
  BookingError,
  overlaps,
  findRestaurant,
  findAvailableTables,
  createBooking,
  findBookingsByPhone,
  cancelBooking,
};
