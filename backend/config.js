// Reservation fee charged through the website to secure a booking slot.
// NOTE: This is a booking/processing fee collected up front — NOT the full official
// exam fee (which varies daily with the USD/NPR rate and is confirmed with the
// customer directly, same as the rest of the industry). Edit these freely.
const EXAM_RESERVATION_FEE = {
  'IELTS': 36000,
  'UKVI IELTS': 36400,
  'PTE Academic': 33000,
  'TOEFL iBT': 35000,
  'Duolingo English Test': 9800,
  'SAT': 19000,
  'GRE': 34000,
  'GMAT': 42000,
  'OET': 0, 
  'NCLEX': 0,
  'Prometric': 0,
};

const TIME_SLOTS = ['Morning (8AM–12PM)', 'Afternoon (12PM–4PM)', 'Evening (4PM–8PM)'];

// Payment methods offered at checkout. `type` tells the backend/frontend how to
// handle each one: 'gateway' = redirect flow with server-side verification,
// 'manual' = show instructions and wait for a human to confirm the payment.
const PAYMENT_METHODS = {
  esewa:  { label: 'eSewa',                      type: 'gateway' },
  khalti: { label: 'Khalti',                     type: 'gateway' },
  bank:   { label: 'Bank Transfer',              type: 'manual' },
  fonepay:{ label: 'FonePay',                    type: 'manual' },
  cod:    { label: 'Cash on Delivery / At Office', type: 'manual' },
};

// Shown to the customer after checkout when they pick a manual payment method.
// Edit these with your real details — freely editable, no code changes needed elsewhere.
const BANK_DETAILS = {
  bank_name: process.env.BANK_NAME || 'Shine Resunga Development Bank Ltd.',
  account_name: process.env.BANK_ACCOUNT_NAME || 'Book My Test',
  account_number: process.env.BANK_ACCOUNT_NUMBER || '03100100763169000001',
  branch: process.env.BANK_BRANCH || 'Manigram Branch',
};

const FONEPAY_DETAILS = {
  merchant_name: process.env.FONEPAY_MERCHANT_NAME || 'BookMyTest',
  fonepay_id: process.env.FONEPAY_ID || '0000000',
  note: 'Scan our FonePay QR (available at our office / sent on WhatsApp) or transfer to the FonePay ID above.',
};

module.exports = { EXAM_RESERVATION_FEE, TIME_SLOTS, PAYMENT_METHODS, BANK_DETAILS, FONEPAY_DETAILS };
