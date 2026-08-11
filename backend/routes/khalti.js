const express = require('express');
const { getOrderByUuid, markOrderPaymentStatus } = require('../db');
const { lookupPayment } = require('../khalti');
const { sendAdminNotification, sendCustomerConfirmation } = require('../mailer');

const router = express.Router();

// Khalti redirects the customer back here (via return_url) after they pay or
// cancel, with ?pidx=...&status=...&purchase_order_id=...&transaction_id=...
router.get('/callback', async (req, res) => {
  const siteBase = process.env.SITE_BASE_URL;
  try {
    const { pidx, purchase_order_id } = req.query;
    if (!pidx || !purchase_order_id) throw new Error('Missing Khalti callback params.');

    const order = getOrderByUuid(purchase_order_id);
    if (!order) throw new Error('Order not found for this transaction.');

    // Never trust the redirect's ?status= alone — always verify server-side
    // against Khalti's own lookup API before marking anything as paid.
    const lookup = await lookupPayment(pidx);

    if (lookup.status !== 'Completed') {
      markOrderPaymentStatus(order.transaction_uuid, lookup.status || 'FAILED', 'PAYMENT_FAILED');
      return res.redirect(`${siteBase}/booking-failed.html?ref=${order.transaction_uuid}`);
    }

    const updated = markOrderPaymentStatus(
      order.transaction_uuid,
      'COMPLETE',
      'AWAITING_PROVIDER_CONFIRMATION',
      lookup.transaction_id
    );

    sendAdminNotification(updated).catch(e => console.error('Admin email failed:', e.message));
    sendCustomerConfirmation(updated).catch(e => console.error('Customer email failed:', e.message));

    res.redirect(`${siteBase}/booking-success.html?ref=${updated.transaction_uuid}`);
  } catch (err) {
    console.error('Khalti callback error:', err.message);
    res.redirect(`${siteBase}/booking-failed.html`);
  }
});

module.exports = router;
