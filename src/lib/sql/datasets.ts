// The tables every SQL lesson uses: one small online shop, so each lesson builds on rows the learner already
// knows. Every number quoted in a lesson comes from running SQL against these tables (sql-outputs.test.ts).
import type { DatasetId } from './types';

export const SHOP_SQL = `CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  signup_date TEXT NOT NULL
);
INSERT INTO customers VALUES
  (1, 'Ada',  'London', '2026-01-05'),
  (2, 'Ben',  'Paris',  '2026-01-12'),
  (3, 'Chen', 'London', '2026-01-20'),
  (4, 'Dana', 'Berlin', '2026-02-02'),
  (5, 'Eli',  'Paris',  '2026-02-14'),
  (6, 'Fay',  NULL,     '2026-02-20'),
  (7, 'Gus',  'Berlin', '2026-03-01'),
  (8, 'Hana', 'London', '2026-03-03');

CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  price    REAL NOT NULL
);
INSERT INTO products VALUES
  (1, 'Notebook',   'stationery',  4.00),
  (2, 'Pen set',    'stationery',  6.50),
  (3, 'Desk lamp',  'home',        32.00),
  (4, 'Mug',        'home',        9.00),
  (5, 'Headphones', 'electronics', 59.00),
  (6, 'Charger',    'electronics', 19.00),
  (7, 'Poster',     'home',        12.00);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers (id),
  order_date  TEXT NOT NULL,
  status      TEXT NOT NULL
);
INSERT INTO orders VALUES
  (101, 1,    '2026-01-06', 'shipped'),
  (102, 2,    '2026-01-15', 'shipped'),
  (103, 1,    '2026-01-28', 'shipped'),
  (104, 3,    '2026-02-03', 'cancelled'),
  (105, 4,    '2026-02-05', 'shipped'),
  (106, 2,    '2026-02-11', 'returned'),
  (107, 5,    '2026-02-16', 'shipped'),
  (108, 1,    '2026-02-22', 'shipped'),
  (109, NULL, '2026-02-25', 'shipped'),
  (110, 3,    '2026-03-02', 'shipped'),
  (111, 6,    '2026-03-04', 'pending'),
  (112, 4,    '2026-03-09', 'shipped');

CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity   INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO order_items VALUES
  (101, 1, 2, 4.00), (101, 2, 1, 6.50),
  (102, 5, 1, 59.00),
  (103, 4, 2, 9.00),
  (104, 3, 1, 32.00),
  (105, 6, 1, 19.00), (105, 1, 3, 4.00),
  (106, 5, 1, 59.00),
  (107, 3, 1, 32.00), (107, 4, 1, 9.00),
  (108, 2, 2, 6.50),
  (109, 4, 1, 9.00),
  (110, 5, 1, 55.00), (110, 6, 1, 19.00),
  (111, 1, 5, 4.00),
  (112, 3, 1, 32.00), (112, 2, 1, 6.50);

CREATE TABLE payments (
  id       INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id),
  paid_at  TEXT NOT NULL,
  amount   REAL NOT NULL
);
INSERT INTO payments VALUES
  (1,  101, '2026-01-06', 14.50),
  (2,  102, '2026-01-15', 59.00),
  (3,  103, '2026-01-28', 18.00),
  (4,  105, '2026-02-05', 31.00),
  (5,  106, '2026-02-11', 59.00),
  (6,  107, '2026-02-16', 20.50),
  (7,  107, '2026-03-16', 20.50),
  (8,  108, '2026-02-22', 13.00),
  (9,  109, '2026-02-25', 9.00),
  (10, 110, '2026-03-02', 37.00),
  (11, 110, '2026-04-02', 37.00),
  (12, 112, '2026-03-09', 38.50);

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees (id),
  dept       TEXT NOT NULL,
  salary     INTEGER NOT NULL
);
INSERT INTO employees VALUES
  (1, 'Rosa', NULL, 'exec',  200),
  (2, 'Sam',  1,    'eng',   150),
  (3, 'Tara', 1,    'sales', 120),
  (4, 'Uma',  2,    'eng',   110),
  (5, 'Vic',  2,    'eng',   105),
  (6, 'Wen',  3,    'sales', 90),
  (7, 'Xia',  4,    'eng',   95);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES customers (id),
  event_time TEXT NOT NULL,
  event      TEXT NOT NULL
);
INSERT INTO events VALUES
  (1, 1, '2026-01-06 10:00:00', 'visit'),
  (2, 1, '2026-01-06 10:03:00', 'view_product'),
  (3, 1, '2026-01-06 10:06:00', 'add_to_cart'),
  (4, 1, '2026-01-06 10:09:00', 'checkout'),
  (5, 1, '2026-01-06 10:10:00', 'purchase'),
  (6, 2, '2026-01-15 14:00:00', 'visit'),
  (7, 2, '2026-01-15 14:05:00', 'view_product'),
  (8, 2, '2026-01-15 14:06:00', 'add_to_cart'),
  (9, 2, '2026-01-15 14:06:00', 'add_to_cart'),
  (10, 2, '2026-01-15 14:10:00', 'checkout'),
  (11, 2, '2026-01-15 14:11:00', 'purchase'),
  (12, 3, '2026-01-20 11:00:00', 'visit'),
  (13, 3, '2026-01-20 11:01:00', 'view_product'),
  (14, 1, '2026-01-28 19:00:00', 'visit'),
  (15, 1, '2026-01-28 19:04:00', 'view_product'),
  (16, 1, '2026-01-28 19:05:00', 'add_to_cart'),
  (17, 1, '2026-01-28 19:08:00', 'checkout'),
  (18, 1, '2026-01-28 19:09:00', 'purchase'),
  (19, 3, '2026-02-03 16:00:00', 'visit'),
  (20, 3, '2026-02-03 16:02:00', 'view_product'),
  (21, 3, '2026-02-03 16:03:00', 'add_to_cart'),
  (22, 3, '2026-02-03 16:04:00', 'checkout'),
  (23, 3, '2026-02-03 16:05:00', 'purchase'),
  (24, 4, '2026-02-05 13:00:00', 'visit'),
  (25, 4, '2026-02-05 13:03:00', 'view_product'),
  (26, 4, '2026-02-05 13:04:00', 'add_to_cart'),
  (27, 4, '2026-02-05 13:06:00', 'checkout'),
  (28, 4, '2026-02-05 13:07:00', 'purchase'),
  (29, 1, '2026-02-10 08:00:00', 'visit'),
  (30, 1, '2026-02-10 08:01:00', 'view_product'),
  (31, 2, '2026-02-11 20:00:00', 'visit'),
  (32, 2, '2026-02-11 20:02:00', 'view_product'),
  (33, 2, '2026-02-11 20:03:00', 'add_to_cart'),
  (34, 2, '2026-02-11 20:05:00', 'checkout'),
  (35, 2, '2026-02-11 20:06:00', 'purchase'),
  (36, 5, '2026-02-14 21:00:00', 'visit'),
  (37, 5, '2026-02-14 21:01:00', 'view_product'),
  (38, 5, '2026-02-14 21:02:00', 'add_to_cart'),
  (39, 5, '2026-02-16 07:00:00', 'visit'),
  (40, 5, '2026-02-16 07:01:00', 'add_to_cart'),
  (41, 5, '2026-02-16 07:02:00', 'checkout'),
  (42, 5, '2026-02-16 07:03:00', 'purchase'),
  (43, 6, '2026-02-20 15:00:00', 'visit'),
  (44, 6, '2026-02-20 15:05:00', 'view_product'),
  (45, 1, '2026-02-22 12:00:00', 'visit'),
  (46, 1, '2026-02-22 12:02:00', 'view_product'),
  (47, 1, '2026-02-22 12:03:00', 'add_to_cart'),
  (48, 1, '2026-02-22 12:40:00', 'view_product'),
  (49, 1, '2026-02-22 12:42:00', 'checkout'),
  (50, 1, '2026-02-22 12:43:00', 'purchase'),
  (51, 7, '2026-03-01 12:00:00', 'visit'),
  (52, 7, '2026-03-01 12:01:00', 'view_product'),
  (53, 7, '2026-03-01 12:03:00', 'add_to_cart'),
  (54, 3, '2026-03-02 09:30:00', 'visit'),
  (55, 3, '2026-03-02 09:31:00', 'view_product'),
  (56, 3, '2026-03-02 09:35:00', 'add_to_cart'),
  (57, 3, '2026-03-02 09:36:00', 'checkout'),
  (58, 3, '2026-03-02 09:37:00', 'purchase'),
  (59, 8, '2026-03-03 18:00:00', 'visit'),
  (60, 6, '2026-03-04 15:00:00', 'visit'),
  (61, 6, '2026-03-04 15:01:00', 'view_product'),
  (62, 6, '2026-03-04 15:02:00', 'add_to_cart'),
  (63, 6, '2026-03-04 15:03:00', 'checkout'),
  (64, 6, '2026-03-04 15:04:00', 'purchase'),
  (65, 4, '2026-03-09 10:00:00', 'visit'),
  (66, 4, '2026-03-09 10:02:00', 'view_product'),
  (67, 4, '2026-03-09 10:03:00', 'add_to_cart'),
  (68, 4, '2026-03-09 10:05:00', 'checkout'),
  (69, 4, '2026-03-09 10:06:00', 'purchase'),
  (70, 1, '2026-03-15 09:00:00', 'visit'),
  (71, 8, '2026-03-20 18:00:00', 'visit'),
  (72, 8, '2026-03-20 18:01:00', 'view_product'),
  (73, 4, '2026-04-01 10:00:00', 'visit'),
  (74, 3, '2026-04-06 18:00:00', 'visit');

-- One row per order with its total value (all statuses), used from the window functions chapter on.
CREATE VIEW order_totals AS
SELECT o.id, o.customer_id, substr(o.order_date, 1, 7) AS month, o.order_date, o.status,
       SUM(oi.quantity * oi.unit_price) AS total
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY o.id;

CREATE TABLE customer_updates (
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  updated_at  TEXT NOT NULL,
  email       TEXT NOT NULL,
  plan        TEXT NOT NULL
);
INSERT INTO customer_updates VALUES
  (1, '2026-01-05 09:00:00', 'ada@old.example',  'free'),
  (1, '2026-02-01 10:00:00', 'ada@new.example',  'free'),
  (1, '2026-03-01 10:00:00', 'ada@new.example',  'pro'),
  (2, '2026-01-12 12:00:00', 'ben@mail.example', 'free'),
  (3, '2026-01-20 08:00:00', 'chen@mail.example', 'free'),
  (3, '2026-02-15 08:00:00', 'chen@mail.example', 'pro'),
  (3, '2026-02-15 08:00:00', 'chen@mail.example', 'pro');

CREATE TABLE logins (
  user_id INTEGER NOT NULL REFERENCES customers (id),
  day     TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
INSERT INTO logins VALUES
  (1, '2026-03-01'), (1, '2026-03-02'), (1, '2026-03-03'), (1, '2026-03-05'), (1, '2026-03-06'), (1, '2026-03-09'),
  (2, '2026-03-02'), (2, '2026-03-03'), (2, '2026-03-04'), (2, '2026-03-05'),
  (3, '2026-03-04'), (3, '2026-03-08');
`;

/** A larger orders table (200,000 rows) for the performance lessons, generated inside SQLite so nothing big is
 * downloaded. Values are deterministic (multiplicative hashing of the id), so every learner gets the same rows. */
export const BIG_ORDERS = 200_000;
export const SHOP_BIG_SQL = `CREATE TABLE big_orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  country     TEXT NOT NULL,
  order_date  TEXT NOT NULL,
  amount      REAL NOT NULL
);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${BIG_ORDERS})
INSERT INTO big_orders
SELECT i,
       (i * 7919) % 20000 + 1,
       CASE (i * 31) % 5 WHEN 0 THEN 'DE' WHEN 1 THEN 'FR' WHEN 2 THEN 'UK' WHEN 3 THEN 'US' ELSE 'JP' END,
       date('2025-01-01', '+' || ((i * 104729) % 730) || ' days'),
       ((i * 2654435761) % 20000) / 100.0
FROM n;
`;

export const DATASETS: Record<DatasetId, { title: string; sql: string; tables: string[] }> = {
  shop: {
    title: 'Shop tables',
    sql: SHOP_SQL,
    tables: ['customers', 'products', 'orders', 'order_items', 'payments', 'employees', 'events', 'customer_updates', 'logins', 'order_totals'],
  },
  'shop-big': { title: 'Shop tables plus big_orders', sql: SHOP_SQL + SHOP_BIG_SQL, tables: ['big_orders'] },
  none: { title: 'Empty database', sql: '', tables: [] },
};
