require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { getOrderByUuid } = require('./db');
const ordersRouter = require('./routes/orders');
const esewaRouter = require('./routes/esewa');
const { EXAM_RESERVATION_FEE, TIME_SLOTS } = require('./config');

const app = express();

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`BookMyTest backend running on port ${PORT} (eSewa mode: ${process.env.ESEWA_MODE || 'test'})`);
});
