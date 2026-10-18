-- Схема бази даних booking-service. Виконується контейнером postgres один раз —
-- при першому створенні тому даних (каталог /docker-entrypoint-initdb.d).

CREATE TABLE restaurants (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  city    VARCHAR(100) NOT NULL,
  cuisine VARCHAR(100) NOT NULL,
  opens   VARCHAR(5)   NOT NULL,  -- HH:MM
  closes  VARCHAR(5)   NOT NULL
);

CREATE TABLE restaurant_tables (
  restaurant_id INTEGER  NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  id            INTEGER  NOT NULL,  -- номер столика в межах ресторану
  seats         SMALLINT NOT NULL CHECK (seats > 0),
  PRIMARY KEY (restaurant_id, id)
);

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  restaurant_id INTEGER      NOT NULL,
  table_id      INTEGER      NOT NULL,
  date          DATE         NOT NULL,
  time          VARCHAR(5)   NOT NULL,  -- HH:MM
  guests        SMALLINT     NOT NULL CHECK (guests > 0),
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(30)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  FOREIGN KEY (restaurant_id, table_id) REFERENCES restaurant_tables (restaurant_id, id)
);

CREATE INDEX bookings_restaurant_date ON bookings (restaurant_id, date);

-- ті самі ресторани, що й у src/store.js
INSERT INTO restaurants (id, name, city, cuisine, opens, closes) VALUES
  (1, 'Під Липою', 'Київ', 'українська', '10:00', '23:00'),
  (2, 'Trattoria Roma', 'Київ', 'італійська', '12:00', '22:00');
SELECT setval('restaurants_id_seq', 2);

INSERT INTO restaurant_tables (restaurant_id, id, seats) VALUES
  (1, 1, 2), (1, 2, 2), (1, 3, 4), (1, 4, 6),
  (2, 1, 4), (2, 2, 4), (2, 3, 8);
