const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data', 'bookings.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_uuid TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    booking_status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    esewa_ref_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    exam TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    preferred_slot TEXT NOT NULL,
    test_center_city TEXT,
    notes TEXT,
    amount INTEGER NOT NULL
  );
`);

const insertOrderStmt = db.prepare(`
  INSERT INTO orders (transaction_uuid, full_name, email, phone, total_amount)
  VALUES (@transaction_uuid, @full_name, @email, @phone, @total_amount)
`);

const insertItemStmt = db.prepare(`
  INSERT INTO order_items (order_id, exam, preferred_date, preferred_slot, test_center_city, notes, amount)
  VALUES (@order_id, @exam, @preferred_date, @preferred_slot, @test_center_city, @notes, @amount)
`);

// Wrapped in a transaction so an order and all its line items are saved atomically —
// either the whole cart is recorded or none of it is.
const createOrderTxn = db.transaction((order, items) => {
  insertOrderStmt.run(order);
  const orderRow = db.prepare(`SELECT id FROM orders WHERE transaction_uuid = ?`).get(order.transaction_uuid);
  for (const item of items) {
    insertItemStmt.run({ ...item, order_id: orderRow.id });
  }
});

function createOrder(order, items) {
  createOrderTxn(order, items);
  return getOrderByUuid(order.transaction_uuid);
}

function getOrderByUuid(uuid) {
  const order = db.prepare(`SELECT * FROM orders WHERE transaction_uuid = ?`).get(uuid);
  if (!order) return null;
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(order.id);
  return { ...order, items };
}

function markOrderPaymentStatus(uuid, paymentStatus, bookingStatus, esewaRefId) {
  db.prepare(`
    UPDATE orders
    SET payment_status = ?, booking_status = ?, esewa_ref_id = ?, updated_at = datetime('now')
    WHERE transaction_uuid = ?
  `).run(paymentStatus, bookingStatus, esewaRefId || null, uuid);
  return getOrderByUuid(uuid);
}

module.exports = { db, createOrder, getOrderByUuid, markOrderPaymentStatus };
