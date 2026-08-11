const nodemailer = require('nodemailer');

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function itemsTable(items) {
  const rows = items.map(i => `
    <tr>
      <td style="border:1px solid #ddd;padding:6px;">${i.exam}</td>
      <td style="border:1px solid #ddd;padding:6px;">${i.preferred_date}</td>
      <td style="border:1px solid #ddd;padding:6px;">${i.preferred_slot}</td>
      <td style="border:1px solid #ddd;padding:6px;">${i.test_center_city || '—'}</td>
      <td style="border:1px solid #ddd;padding:6px;">${i.notes || '—'}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right;">NPR ${i.amount}</td>
    </tr>`).join('');
  return `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Exam</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Date</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Slot</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">City</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Notes</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:right;">Fee</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const PAYMENT_METHOD_LABELS = {
  esewa: 'eSewa',
  khalti: 'Khalti',
  bank: 'Bank Transfer',
  fonepay: 'FonePay',
  cod: 'Cash on Delivery / At Office',
};

function isPendingVerification(order) {
  return order.payment_status === 'PENDING_VERIFICATION';
}

async function sendAdminNotification(order) {
  const transport = getTransport();
  const pending = isPendingVerification(order);
  const methodLabel = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method;
  const html = `
    <h2>${pending ? 'New Order — Payment Verification Needed' : 'New Paid Order'} — BookMyTest (${order.items.length} exam${order.items.length > 1 ? 's' : ''})</h2>
    <p><strong>Name:</strong> ${order.full_name}<br>
       <strong>Email:</strong> ${order.email}<br>
       <strong>Phone:</strong> ${order.phone}</p>
    ${itemsTable(order.items)}
    <p><strong>Total:</strong> NPR ${order.total_amount}<br>
       <strong>Payment Method:</strong> ${methodLabel}<br>
       <strong>Payment Ref:</strong> ${order.esewa_ref_id || '—'}<br>
       <strong>Transaction UUID:</strong> ${order.transaction_uuid}</p>
    ${pending
      ? `<p><strong>Action needed:</strong> confirm this ${methodLabel} payment manually (bank slip, FonePay screenshot, or cash on visit) before proceeding with the booking.</p>`
      : `<p>Next step: confirm each test slot with the official provider and follow up with the customer.</p>`}
  `;
  await transport.sendMail({
    from: `"BookMyTest Website" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `${pending ? '[Verify Payment] ' : ''}New Order (${order.items.length} exam${order.items.length > 1 ? 's' : ''}): ${order.full_name}`,
    html,
  });
}

async function sendCustomerConfirmation(order) {
  const transport = getTransport();
  const pending = isPendingVerification(order);
  const methodLabel = PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method;
  const html = `
    <h2>Thanks for booking with BookMyTest!</h2>
    <p>Hi ${order.full_name}, we've received your booking request for ${order.items.length} exam${order.items.length > 1 ? 's' : ''}:</p>
    ${itemsTable(order.items)}
    <p><strong>Total:</strong> NPR ${order.total_amount}<br>
       <strong>Payment Method:</strong> ${methodLabel}<br>
       <strong>Reference:</strong> ${order.transaction_uuid}</p>
    ${pending
      ? `<p>Your reservation is held, pending confirmation of your ${methodLabel} payment. Please send your payment screenshot/receipt (mentioning reference <strong>${order.transaction_uuid.slice(0, 8)}</strong>) on WhatsApp so we can confirm it right away.</p>`
      : `<p>Our team will confirm your exact test dates and centers directly with each official provider and reach out on WhatsApp/phone at ${order.phone} within a few hours.</p>`}
    <p>Questions? Message us on WhatsApp: ${process.env.ADMIN_PHONE_DISPLAY || ''}</p>
    <p>— BookMyTest, Tilottama-5, Manigram, Rupandehi</p>
  `;
  await transport.sendMail({
    from: `"BookMyTest" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `${pending ? 'Booking received — payment verification pending' : 'Your BookMyTest order is confirmed'} (${order.items.length} exam${order.items.length > 1 ? 's' : ''})`,
    html,
  });
}

module.exports = { sendAdminNotification, sendCustomerConfirmation };
