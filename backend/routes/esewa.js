const express = require('express');
const { getOrderByUuid, markOrderPaymentStatus } = require('../db');
const { decodeCallbackData, verifyCallbackSignature, checkTransactionStatus } = require('../esewa');
const { sendAdminNotification, sendCustomerConfirmation } = require('../mailer');

const router = express.Router();

router.get('/success', async (req, res) => {
  const siteBase = process.env.SITE_BASE_URL;
  try {
    const raw = req.query.data;
    if (!raw) throw new Error('Missing eSewa callback data.');

    const payload = decodeCallbackData(raw);

    if (!verifyCallbackSignature(payload)) {
      throw new Error('Signature verification failed — possible tampering.');
    }

    const order = getOrderByUuid(payload.transaction_uuid);
    if (!order) throw new Error('Order not found for this transaction.');

    // Double-check directly against eSewa's own status API before trusting the redirect.
    const status = await checkTransactionStatus({
      totalAmount: order.total_amount,
      transactionUuid: order.transaction_uuid,
    });

    if (status.status !== 'COMPLETE') {
      markOrderPaymentStatus(order.transaction_uuid, status.status || 'FAILED', 'PAYMENT_FAILED');
      return res.redirect(`${siteBase}/booking-failed.html?ref=${order.transaction_uuid}`);
    }

    const updated = markOrderPaymentStatus(
      order.transaction_uuid,
      'COMPLETE',
      'AWAITING_PROVIDER_CONFIRMATION',
      status.ref_id
    );

    sendAdminNotification(updated).catch(e => console.error('Admin email failed:', e.message));
    sendCustomerConfirmation(updated).catch(e => console.error('Customer email failed:', e.message));

    res.redirect(`${siteBase}/booking-success.html?ref=${updated.transaction_uuid}`);
  } catch (err) {
    console.error('eSewa success handler error:', err.message);
    res.redirect(`${siteBase}/booking-failed.html`);
  }
});

router.get('/failure', (req, res) => {
  const siteBase = process.env.SITE_BASE_URL;
  const ref = req.query.ref;
  if (ref) {
    markOrderPaymentStatus(ref, 'FAILED', 'PAYMENT_FAILED');
  }
  res.redirect(`${siteBase}/booking-failed.html${ref ? `?ref=${ref}` : ''}`);
});

module.exports = router;
