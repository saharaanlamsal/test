const KHALTI_MODE = process.env.KHALTI_MODE || 'test';
const SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

const BASE_URL = KHALTI_MODE === 'live'
  ? 'https://khalti.com/api/v2'
  : 'https://dev.khalti.com/api/v2';

// Initiates a Khalti ePayment (KPG-2) transaction and returns the hosted
// payment_url the customer should be redirected to.
async function initiatePayment({ amount, purchaseOrderId, purchaseOrderName, returnUrl, websiteUrl, customer }) {
  if (!SECRET_KEY) throw new Error('KHALTI_SECRET_KEY is not set.');

  const res = await fetch(`${BASE_URL}/epayment/initiate/`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: Math.round(amount * 100), // Khalti expects paisa, not rupees
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `Khalti initiate failed: ${res.status}`);
  }
  return data; // { pidx, payment_url, expires_at, expires_in }
}

// Server-side verification — never trust the redirect query params alone,
// since a browser reload/replay could otherwise be used to spoof success.
async function lookupPayment(pidx) {
  if (!SECRET_KEY) throw new Error('KHALTI_SECRET_KEY is not set.');

  const res = await fetch(`${BASE_URL}/epayment/lookup/`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `Khalti lookup failed: ${res.status}`);
  }
  return data; // { status: 'Completed' | 'Pending' | 'Expired' | 'User canceled' | ..., total_amount, transaction_id, ... }
}

module.exports = { initiatePayment, lookupPayment };
