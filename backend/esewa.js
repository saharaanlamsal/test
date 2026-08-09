const crypto = require('crypto');

const ESEWA_MODE = process.env.ESEWA_MODE || 'test';
const MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";

const FORM_URL = ESEWA_MODE === 'live'
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const STATUS_CHECK_URL = ESEWA_MODE === 'live'
  ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
  : 'https://rc.esewa.com.np/api/epay/transaction/status/';

// eSewa requires an HMAC-SHA256 signature (base64) over a specific comma-joined
// field string, using field names/order exactly as declared in signed_field_names.
function generateSignature(totalAmount, transactionUuid, productCode) {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(message);
  return hmac.digest('base64');
}

function buildPaymentForm({ amount, transactionUuid, successUrl, failureUrl }) {
  const totalAmount = amount; // no tax/service/delivery charges added
  const signature = generateSignature(totalAmount, transactionUuid, MERCHANT_CODE);

  return {
    action: FORM_URL,
    fields: {
      amount: String(amount),
      tax_amount: '0',
      total_amount: String(totalAmount),
      transaction_uuid: transactionUuid,
      product_code: MERCHANT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
  };
}

// eSewa redirects back to success_url with a base64-encoded JSON string in ?data=
function decodeCallbackData(base64Data) {
  const json = Buffer.from(base64Data, 'base64').toString('utf-8');
  return JSON.parse(json);
}

function verifyCallbackSignature(payload) {
  const fields = payload.signed_field_names.split(',');
  const message = fields.map(f => `${f}=${payload[f]}`).join(',');
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(message);
  const expected = hmac.digest('base64');
  return expected === payload.signature;
}

// Extra server-side check against eSewa's own status API — belt and suspenders,
// since the redirect callback alone can be spoofed by a browser reload.
async function checkTransactionStatus({ totalAmount, transactionUuid }) {
  const url = `${STATUS_CHECK_URL}?product_code=${MERCHANT_CODE}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eSewa status check failed: ${res.status}`);
  return res.json(); // { status: 'COMPLETE' | 'PENDING' | 'FULL_REFUND' | ... , ref_id, ... }
}

module.exports = {
  buildPaymentForm,
  decodeCallbackData,
  verifyCallbackSignature,
  checkTransactionStatus,
  MERCHANT_CODE,
};
