// Сховище в PostgreSQL (етап 2, Docker Compose). Схема й початкові дані —
// db/init.sql, який виконує контейнер postgres при першому створенні тому.

const { Pool, types } = require('pg');

// DATE повертати рядком YYYY-MM-DD, а не об'єктом Date (інакше зсув часового поясу)
types.setTypeParser(types.builtins.DATE, (value) => value);

const BOOKING_COLUMNS = 'id, restaurant_id AS "restaurantId", table_id AS "tableId", date, time, guests, name, phone';

// запити однакові для пулу з'єднань і для клієнта всередині транзакції
function queries(db) {
  return {
    async listRestaurants() {
      const { rows } = await db.query(
        `SELECT r.id, r.name, r.city, r.cuisine, r.opens, r.closes, COUNT(t.id)::int AS tables
           FROM restaurants r LEFT JOIN restaurant_tables t ON t.restaurant_id = r.id
          GROUP BY r.id ORDER BY r.id`
      );
      return rows;
    },

    async getRestaurant(id, { lock = false } = {}) {
      const { rows } = await db.query(
        `SELECT id, name, city, cuisine, opens, closes FROM restaurants WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
        [id]
      );
      if (!rows[0]) return null;
      const tables = await db.query('SELECT id, seats FROM restaurant_tables WHERE restaurant_id = $1 ORDER BY id', [id]);
      return { ...rows[0], tables: tables.rows };
    },

    async bookingsOn(restaurantId, date) {
      const { rows } = await db.query(
        `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE restaurant_id = $1 AND date = $2`,
        [restaurantId, date]
      );
      return rows;
    },

    async insertBooking(b) {
      const { rows } = await db.query(
        `INSERT INTO bookings (restaurant_id, table_id, date, time, guests, name, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${BOOKING_COLUMNS}`,
        [b.restaurantId, b.tableId, b.date, b.time, b.guests, b.name, b.phone]
      );
      return rows[0];
    },

    async bookingsByPhone(phone) {
      const { rows } = await db.query(
        `SELECT ${BOOKING_COLUMNS} FROM bookings
          WHERE regexp_replace(phone, '[^0-9+]', '', 'g') = $1 ORDER BY date, time`,
        [phone]
      );
      return rows;
    },

    async deleteBooking(id) {
      const { rows } = await db.query(`DELETE FROM bookings WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`, [id]);
      return rows[0] || null;
    },
  };
}

function createPostgresRepo(config) {
  const pool = new Pool({ connectionTimeoutMillis: 3000, ...config });
  // без обробника обрив неактивного з'єднання (перезапуск БД) завершив би процес
  pool.on('error', (err) => console.error(`PostgreSQL connection error: ${err.message}`));

  return {
    kind: 'postgres',
    ...queries(pool),

    async ping() {
      await pool.query('SELECT 1');
      return 'postgres';
    },

    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(queries(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    close: () => pool.end(),
  };
}

module.exports = { createPostgresRepo };
