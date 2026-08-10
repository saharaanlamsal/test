require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { getOrderByUuid } = require('./db');
const ordersRouter = require('./routes/orders');
const esewaRouter = require('./routes/esewa');
const { EXAM_RESERVATION_FEE, TIME_SLOTS } = require('./config');

const app = express();

// Serve the static frontend from the new frontend folder when the backend is deployed
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://bookmytestnepal.com.np'
    ]
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Lets the frontend render exam names/prices/slots without hardcoding them twice.
app.get('/api/config', (req, res) => {
  res.json({ examFees: EXAM_RESERVATION_FEE, timeSlots: TIME_SLOTS });
});

// Used by booking-success.html to display the order details after payment.
app.get('/api/orders/:uuid', (req, res) => {
  const order = getOrderByUuid(req.params.uuid);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.use('/api/orders', ordersRouter);
app.use('/api/esewa', esewaRouter);

// Ensure the backend root route serves the frontend homepage after the move.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`BookMyTest backend running on port ${PORT}`);
});