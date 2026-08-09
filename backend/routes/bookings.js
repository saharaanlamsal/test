const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createBooking } = require('../db');
const { buildPaymentForm } = require('../esewa');
const { EXAM_RESERVATION_FEE } = require('../config');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const { full_name, email, phone, exam, preferred_date, preferred_slot, test_center_city, notes } = req.body;

    if (!full_name || !email || !phone || !exam || !preferred_date || !preferred_slot) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const amount = EXAM_RESERVATION_FEE[exam];
    if (!amount) {
      return res.status(400).json({ error: 'Unknown exam selected.' });
    }

    const transaction_uuid = uuidv4();

    const booking = createBooking({
      transaction_uuid,
      full_name,
      email,
      phone,
      exam,
      preferred_date,
      preferred_slot,
      test_center_city: test_center_city || null,
      notes: notes || null,
      amount,
    });

    const siteBase = process.env.SITE_BASE_URL;
    const appBase = process.env.APP_BASE_URL;

    const { action, fields } = buildPaymentForm({
      amount,
      transactionUuid: transaction_uuid,
      // eSewa hits these on OUR backend so we can verify server-side before
      // sending the customer on to the pretty success/failure page on the site.
      successUrl: `${appBase}/api/esewa/success`,
      failureUrl: `${appBase}/api/esewa/failure?ref=${transaction_uuid}`,
    });

    res.json({ booking, esewa: { action, fields } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create booking. Please try again.' });
  }
});

module.exports = router;
