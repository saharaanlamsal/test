const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createOrder, markOrderPaymentStatus } = require('../db');
const { buildPaymentForm } = require('../esewa');
const { initiatePayment } = require('../khalti');
const { sendAdminNotification, sendCustomerConfirmation } = require('../mailer');
const { EXAM_RESERVATION_FEE, PAYMENT_METHODS } = require('../config');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, items } = req.body;
    const payment_method = String(req.body.payment_method || 'esewa').toLowerCase();

    if (!full_name || !email || !phone) {
      return res.status(400).json({ error: 'Missing contact details.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty — add at least one exam before checking out.' });
    }
    if (!PAYMENT_METHODS[payment_method]) {
      return res.status(400).json({ error: 'Please choose a valid payment method.' });
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
      { transaction_uuid, full_name, email, phone, total_amount, payment_method },
      validatedItems
    );

    const appBase = process.env.APP_BASE_URL;
    const siteBase = process.env.SITE_BASE_URL;

    // ---- Gateway methods: redirect the customer to pay, verify server-side later ----
    if (payment_method === 'esewa') {
      const { action, fields } = buildPaymentForm({
        amount: total_amount,
        transactionUuid: transaction_uuid,
        successUrl: `${appBase}/api/esewa/success`,
        failureUrl: `${appBase}/api/esewa/failure?ref=${transaction_uuid}`,
      });
      return res.json({ order, redirect: { type: 'form', action, fields } });
    }

    if (payment_method === 'khalti') {
      const khalti = await initiatePayment({
        amount: total_amount,
        purchaseOrderId: transaction_uuid,
        purchaseOrderName: `BookMyTest — ${validatedItems.length} exam${validatedItems.length > 1 ? 's' : ''}`,
        returnUrl: `${appBase}/api/khalti/callback`,
        websiteUrl: siteBase,
        customer: { name: full_name, email, phone },
      });
      return res.json({ order, redirect: { type: 'url', url: khalti.payment_url } });
    }

    // ---- Manual methods: no online charge happens here — a staff member
    // confirms the payment later (bank slip / FonePay screenshot / cash on visit) ----
    const updated = markOrderPaymentStatus(transaction_uuid, 'PENDING_VERIFICATION', 'AWAITING_PAYMENT_VERIFICATION');

    sendAdminNotification(updated).catch(e => console.error('Admin email failed:', e.message));
    sendCustomerConfirmation(updated).catch(e => console.error('Customer email failed:', e.message));

    return res.json({ order: updated, redirect: { type: 'pending' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create your order. Please try again.' });
  }
});

module.exports = router;
