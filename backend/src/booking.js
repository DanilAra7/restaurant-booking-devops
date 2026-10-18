// Бізнес-правила бронювання столиків — чисті функції без доступу до сховища
// й HTTP, тому однаково працюють з in-memory сховищем і з PostgreSQL та
// покриваються модульними тестами.

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

// 2026-02-30 проходить регулярний вираз, але такої дати немає
function isRealDate(date) {
  return DATE_RE.test(date) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
}

function validateRequest(restaurant, { date, time, guests }) {
  if (!isRealDate(String(date))) throw new BookingError('VALIDATION', 'Дата має бути у форматі YYYY-MM-DD');
  if (!TIME_RE.test(String(time))) throw new BookingError('VALIDATION', 'Час має бути у форматі HH:MM');
  const n = Number(guests);
  if (!Number.isInteger(n) || n < 1) throw new BookingError('VALIDATION', 'Кількість гостей має бути цілим числом від 1');
  const start = toMinutes(time);
  if (start < toMinutes(restaurant.opens) || start + BOOKING_MINUTES > toMinutes(restaurant.closes)) {
    throw new BookingError('VALIDATION', `Бронювання можливе з ${restaurant.opens} і має завершитися до ${restaurant.closes}`);
  }
}

function validateGuest({ name, phone }) {
  if (!name || !String(name).trim()) throw new BookingError('VALIDATION', "Ім'я гостя обов'язкове");
  if (!phone || !String(phone).trim()) throw new BookingError('VALIDATION', "Телефон обов'язковий");
}

// вільні столики, що вміщують гостей, від найменшого до найбільшого;
// dayBookings — бронювання цього ресторану на обрану дату
function freeTables(restaurant, dayBookings, { time, guests }) {
  const busy = new Set(dayBookings.filter((b) => overlaps(b.time, time)).map((b) => b.tableId));
  return restaurant.tables
    .filter((t) => t.seats >= Number(guests) && !busy.has(t.id))
    .sort((a, b) => a.seats - b.seats);
}

const normalizePhone = (phone) => String(phone || '').replace(/[^\d+]/g, '');

module.exports = {
  BOOKING_MINUTES,
  BookingError,
  overlaps,
  validateRequest,
  validateGuest,
  freeTables,
  normalizePhone,
};
