require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { getOrderByUuid } = require('./db');
const ordersRouter = require('./routes/orders');
const esewaRouter = require('./routes/esewa');
const khaltiRouter = require('./routes/khalti');

const {
    EXAM_RESERVATION_FEE,
    TIME_SLOTS,
    PAYMENT_METHODS,
    BANK_DETAILS,
    FONEPAY_DETAILS
} = require('./config');

const app = express();

// ================================
// CORS
// ================================
app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:4001',
        'https://bookmytestnepal.com.np'
    ]
}));

// ================================
// JSON BODY PARSER
// ================================
app.use(express.json());

// ================================
// SERVE FRONTEND
// ================================
// Frontend folder is inside backend:
// backend/frontend/
app.use(express.static(path.join(__dirname, 'frontend')));

// ================================
// HOMEPAGE
// ================================
app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'frontend', 'index.html')
    );
});

// ================================
// HEALTH CHECK
// ================================
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// ================================
// WEBSITE CONFIG
// ================================
app.get('/api/config', (req, res) => {
    res.json({
        examFees: EXAM_RESERVATION_FEE,
        timeSlots: TIME_SLOTS,
        paymentMethods: PAYMENT_METHODS,
        bankDetails: BANK_DETAILS,
        fonepayDetails: FONEPAY_DETAILS
    });
});

// ================================
// GET ORDER BY UUID
// ================================
app.get('/api/orders/:uuid', (req, res) => {
    const order = getOrderByUuid(req.params.uuid);

    if (!order) {
        return res.status(404).json({
            error: 'Not found'
        });
    }

    res.json(order);
});

// ================================
// API ROUTES
// ================================
app.use('/api/orders', ordersRouter);
app.use('/api/esewa', esewaRouter);
app.use('/api/khalti', khaltiRouter);

// ================================
// PORT
// ================================
const PORT = process.env.PORT || 4001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(
        `BookMyTest backend running on port ${PORT}`
    );
});
