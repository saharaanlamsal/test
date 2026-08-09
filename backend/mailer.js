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

async function sendAdminNotification(order) {
  const transport = getTransport();
  const html = `
    <h2>New Paid Order — BookMyTest (${order.items.length} exam${order.items.length > 1 ? 's' : ''})</h2>
    <p><strong>Name:</strong> ${order.full_name}<br>
       <strong>Email:</strong> ${order.email}<br>
       <strong>Phone:</strong> ${order.phone}</p>
    ${itemsTable(order.items)}
    <p><strong>Total Paid:</strong> NPR ${order.total_amount}<br>
       <strong>eSewa Ref ID:</strong> ${order.esewa_ref_id || '—'}<br>
       <strong>Transaction UUID:</strong> ${order.transaction_uuid}</p>
    <p>Next step: confirm each test slot with the official provider and follow up with the customer.</p>
  `;
  await transport.sendMail({
    from: `"BookMyTest Website" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Order (${order.items.length} exam${order.items.length > 1 ? 's' : ''}): ${order.full_name}`,
    html,
  });
}

async function sendCustomerConfirmation(order) {
  const transport = getTransport();
  const html = `
    <h2>Thanks for booking with BookMyTest!</h2>
    <p>Hi ${order.full_name}, we've received your payment for ${order.items.length} exam${order.items.length > 1 ? 's' : ''}:</p>
    ${itemsTable(order.items)}
    <p><strong>Total paid:</strong> NPR ${order.total_amount}<br>
       <strong>Reference:</strong> ${order.transaction_uuid}</p>
    <p>Our team will confirm your exact test dates and centers directly with each official provider and reach out on WhatsApp/phone at ${order.phone} within a few hours.</p>
    <p>Questions? Message us on WhatsApp: ${process.env.ADMIN_PHONE_DISPLAY || ''}</p>
    <p>— BookMyTest, Tilottama-5, Manigram, Rupandehi</p>
  `;
  await transport.sendMail({
    from: `"BookMyTest" <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `Your BookMyTest order is confirmed (${order.items.length} exam${order.items.length > 1 ? 's' : ''})`,
    html,
  });
}

module.exports = { sendAdminNotification, sendCustomerConfirmation };
