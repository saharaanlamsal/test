const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createOrder } = require('../db');
const { buildPaymentForm } = require('../esewa');
const { EXAM_RESERVATION_FEE } = require('../config');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const { full_name, email, phone, items } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ error: 'Missing contact details.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty — add at least one exam before checking out.' });
    }

    // Recompute every price server-side from config.js — never trust amounts sent
    // by the browser, since a modified request could otherwise pay less than owed.
    let total_amount = 0;
    const validatedItems = [];
    for (const item of items) {
      const { exam, preferred_date, preferred_slot, test_center_city, notes } = item;
      if (!exam || !preferred_date || !preferred_slot) {
        return res.status(400).json({ error: 'Each cart item needs an exam, date, and time slot.' });
      }
      const amount = EXAM_RESERVATION_FEE[exam];
      if (!amount) {
        return res.status(400).json({ error: `Unknown exam in cart: ${exam}` });
      }
      total_amount += amount;
      validatedItems.push({
        exam,
        preferred_date,
        preferred_slot,
        test_center_city: test_center_city || null,
        notes: notes || null,
        amount,
      });
    }

    const transaction_uuid = uuidv4();

    const order = createOrder(
      { transaction_uuid, full_name, email, phone, total_amount },
      validatedItems
    );

    const appBase = process.env.APP_BASE_URL;

    const { action, fields } = buildPaymentForm({
      amount: total_amount,
      transactionUuid: transaction_uuid,
      successUrl: `${appBase}/api/esewa/success`,
      failureUrl: `${appBase}/api/esewa/failure?ref=${transaction_uuid}`,
    });

    res.json({ order, esewa: { action, fields } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create your order. Please try again.' });
  }
});

module.exports = router;
