// Початкові дані для in-memory сховища (repo/memory.js). Ті самі ресторани
// заносить у PostgreSQL скрипт db/init.sql.

function createStore() {
  return {
    restaurants: [
      {
        id: 1,
        name: 'Під Липою',
        city: 'Київ',
        cuisine: 'українська',
        opens: '10:00',
        closes: '23:00',
        tables: [
          { id: 1, seats: 2 },
          { id: 2, seats: 2 },
          { id: 3, seats: 4 },
          { id: 4, seats: 6 },
        ],
      },
      {
        id: 2,
        name: 'Trattoria Roma',
        city: 'Київ',
        cuisine: 'італійська',
        opens: '12:00',
        closes: '22:00',
        tables: [
          { id: 1, seats: 4 },
          { id: 2, seats: 4 },
          { id: 3, seats: 8 },
        ],
      },
    ],
    bookings: [],
    nextBookingId: 1,
  };
}

module.exports = { createStore };
