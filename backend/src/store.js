// In-memory сховище для етапу 1. На наступних етапах буде замінене на БД
// (PostgreSQL у Kubernetes, описану через Terraform).

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
