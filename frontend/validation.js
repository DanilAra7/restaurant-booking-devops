// Валідація форми бронювання на клієнті. Працює і в браузері (window.validateBookingForm),
// і в Node (module.exports) — щоб покрити її тестами в CI.
(function (root) {
  const PHONE_RE = /^\+?\d{10,13}$/;

  function validateBookingForm({ name, phone, guests, date, time }) {
    const errors = [];
    if (!name || !name.trim()) errors.push("Вкажіть ім'я");
    if (!PHONE_RE.test(String(phone || '').replace(/[\s()-]/g, ''))) errors.push('Некоректний номер телефону');
    const n = Number(guests);
    if (!Number.isInteger(n) || n < 1 || n > 20) errors.push('Кількість гостей — від 1 до 20');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) errors.push('Оберіть дату');
    if (!/^\d{2}:\d{2}$/.test(time || '')) errors.push('Оберіть час');
    return errors;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateBookingForm };
  } else {
    root.validateBookingForm = validateBookingForm;
  }
})(this);
