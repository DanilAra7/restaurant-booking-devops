// Клієнт для booking-service. Адресу API можна перевизначити через ?api=...
const API_URL = new URLSearchParams(location.search).get('api') || 'http://localhost:3000';

const form = document.getElementById('booking-form');
const message = document.getElementById('message');

function show(text, kind) {
  message.textContent = text;
  message.className = kind;
}

function formData() {
  return Object.fromEntries(new FormData(form));
}

async function request(path, options) {
  const res = await fetch(API_URL + path, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Помилка запиту');
  return body;
}

async function loadRestaurants() {
  const restaurants = await request('/restaurants');
  document.getElementById('restaurant').innerHTML = restaurants
    .map((r) => `<option value="${r.id}">${r.name} (${r.cuisine}, ${r.opens}–${r.closes})</option>`)
    .join('');
}

document.getElementById('check').addEventListener('click', async () => {
  const { restaurantId, date, time, guests } = formData();
  try {
    const params = new URLSearchParams({ date, time, guests });
    const { available } = await request(`/restaurants/${restaurantId}/availability?${params}`);
    show(available ? 'Є вільні столики' : 'На цей час вільних столиків немає', available ? 'ok' : 'error');
  } catch (err) {
    show(err.message, 'error');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = formData();
  const errors = validateBookingForm(data);
  if (errors.length) return show(errors.join('. '), 'error');
  try {
    const booking = await request('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    show(`Бронювання №${booking.id} підтверджено: столик ${booking.tableId}, ${booking.date} о ${booking.time}`, 'ok');
  } catch (err) {
    show(err.message, 'error');
  }
});

// не дозволяємо обрати минулу дату (локальна дата користувача, не UTC)
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
form.elements.date.min = today.toISOString().slice(0, 10);

loadRestaurants().catch(() => show('API недоступне — запустіть backend (npm start у каталозі backend)', 'error'));
