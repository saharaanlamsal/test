// BookMyTest — single-test booking + payment logic
const API_BASE =
    window.BOOKMYTEST_API_BASE ||
    (window.location.port === '5500' ? 'http://localhost:4001' : '');

let examFees = {};
let paymentMethods = {};
let bankDetails = {};
let fonepayDetails = {};
let selectedPaymentMethod = 'esewa';

// Minimal inline icon per method — avoids reproducing any brand's actual logo artwork.
const PAYMENT_ICONS = {
  esewa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>',
  khalti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-6 9 6"/><path d="M5 10v9M10 10v9M14 10v9M19 10v9"/><path d="M3 21h18"/></svg>',
  fonepay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  cod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="12" rx="2"/><circle cx="12" cy="13" r="3"/></svg>',
};

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const examSelect = document.getElementById('exam');
  const dateInput = document.getElementById('preferred_date');
  const slotSelect = document.getElementById('slot');
  const cityInput = document.getElementById('test_center_city');
  const errorBox = document.getElementById('formError');
  const submitBtn = document.getElementById('payBtn');
  const summaryEmpty = document.getElementById('summaryEmpty');
  const summaryDetails = document.getElementById('summaryDetails');
  const summaryExam = document.getElementById('summaryExam');
  const summaryMeta = document.getElementById('summaryMeta');
  const summaryPrice = document.getElementById('summaryPrice');
  const sumAmount = document.getElementById('sumAmount');
  const paymentMethodsBox = document.getElementById('paymentMethods');
  const manualNoteBox = document.getElementById('manualPaymentNote');

  // Pull exam names/prices/slots/payment options from the backend so the frontend
  // never drifts out of sync with what the server will actually charge or accept.
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    const cfg = await res.json();
    examFees = cfg.examFees;
    paymentMethods = cfg.paymentMethods || {};
    bankDetails = cfg.bankDetails || {};
    fonepayDetails = cfg.fonepayDetails || {};

    examSelect.innerHTML = '<option value="" disabled selected>Select an test</option>' +
      Object.keys(examFees).map(name => `<option value="${name}">${name} — NPR ${examFees[name].toLocaleString()}</option>`).join('');

    slotSelect.innerHTML = '<option value="" disabled selected>Select a time slot</option>' +
      cfg.timeSlots.map(s => `<option value="${s}">${s}</option>`).join('');

    renderPaymentMethods();
  } catch (e) {
    showError('Could not reach the booking server. Please try again shortly, or book via WhatsApp instead.');
    submitBtn.disabled = true;
  }

  function renderPaymentMethods() {
    const keys = Object.keys(paymentMethods);
    if (keys.length === 0) return;
    if (!keys.includes(selectedPaymentMethod)) selectedPaymentMethod = keys[0];

    paymentMethodsBox.innerHTML = keys.map(key => `
      <label class="payment-option${key === selectedPaymentMethod ? ' selected' : ''}" data-method="${key}">
        <input type="radio" name="payment_method" value="${key}" ${key === selectedPaymentMethod ? 'checked' : ''}>
        <span class="payment-option-label">
          <span class="payment-option-icon">${PAYMENT_ICONS[key] || ''}</span>
          ${paymentMethods[key].label}
        </span>
      </label>
    `).join('');

    paymentMethodsBox.querySelectorAll('.payment-option').forEach(el => {
      el.addEventListener('click', () => {
        selectedPaymentMethod = el.dataset.method;
        paymentMethodsBox.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
        updateSubmitLabel();
        renderManualNote();
      });
    });

    updateSubmitLabel();
    renderManualNote();
  }

  function updateSubmitLabel() {
    const label = paymentMethods[selectedPaymentMethod]?.label || 'Selected Method';
    submitBtn.textContent = paymentMethods[selectedPaymentMethod]?.type === 'manual'
      ? `Confirm Booking — Pay via ${label}`
      : `Pay with ${label} & Confirm Booking`;
  }

  function renderManualNote() {
    const method = selectedPaymentMethod;
    if (method === 'bank') {
      manualNoteBox.style.display = 'block';
      manualNoteBox.innerHTML = `
        <strong>Bank Transfer Details</strong>
        <div class="detail-row"><span>Bank</span><span>${bankDetails.bank_name || ''}</span></div>
        <div class="detail-row"><span>Account Name</span><span>${bankDetails.account_name || ''}</span></div>
        <div class="detail-row"><span>Account No.</span><span>${bankDetails.account_number || ''}</span></div>
        <div class="detail-row"><span>Branch</span><span>${bankDetails.branch || ''}</span></div>
        <p style="margin-top:8px;">After transferring, send us the screenshot on WhatsApp with your booking reference so we can confirm your slot.</p>
      `;
    } else if (method === 'fonepay') {
      manualNoteBox.style.display = 'block';
      manualNoteBox.innerHTML = `
        <strong>FonePay Details</strong>
        <div class="detail-row"><span>Merchant</span><span>${fonepayDetails.merchant_name || ''}</span></div>
        <div class="detail-row"><span>FonePay ID</span><span>${fonepayDetails.fonepay_id || ''}</span></div>
        <p style="margin-top:8px;">${fonepayDetails.note || ''} After paying, send your screenshot on WhatsApp with your booking reference.</p>
      `;
    } else if (method === 'cod') {
      manualNoteBox.style.display = 'block';
      manualNoteBox.innerHTML = `
        <strong>Cash on Delivery / Pay at Office</strong>
        <p>Your booking will be held, and you can pay the reservation fee in cash when you visit our office in Manigram, Tilottama-5, Rupandehi — or when our team meets you.</p>
      `;
    } else {
      manualNoteBox.style.display = 'none';
      manualNoteBox.innerHTML = '';
    }
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function clearError() {
    errorBox.classList.remove('show');
  }

  // Renders the single-test order summary as the person fills in the form,
  // and enables the pay button once exam, date, and slot are all chosen.
  function updateSummary() {
    const exam = examSelect.value;
    const date = dateInput.value;
    const slot = slotSelect.value;
    const city = cityInput.value.trim();
    const amount = examFees[exam] || 0;

    if (!exam) {
      summaryEmpty.style.display = 'block';
      summaryDetails.style.display = 'none';
      submitBtn.disabled = true;
      sumAmount.textContent = '0';
      return;
    }

    summaryEmpty.style.display = 'none';
    summaryDetails.style.display = 'block';
    summaryExam.textContent = exam;
    summaryMeta.textContent = [date, slot, city].filter(Boolean).join(' · ') || 'Date & slot not set yet';
    summaryPrice.textContent = `NPR ${amount.toLocaleString()}`;
    sumAmount.textContent = amount.toLocaleString();

    submitBtn.disabled = !(exam && date && slot);
  }

  [examSelect, dateInput, slotSelect, cityInput].forEach(el => {
    el.addEventListener('change', updateSummary);
    el.addEventListener('input', updateSummary);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const exam = examSelect.value;
    const date = dateInput.value;
    const slot = slotSelect.value;
    const city = cityInput.value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!exam || !date || !slot) {
      showError('Please select a test, date, and time slot before continuing to payment.');
      return;
    }

    const item = {
      exam,
      preferred_date: date,
      preferred_slot: slot,
      test_center_city: city,
      notes,
      amount: examFees[exam],
    };

    const contact = {
      full_name: document.getElementById('full_name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
    };

    if (!contact.full_name || !contact.email || !contact.phone) {
      showError('Please fill in your name, email, and phone number before continuing to payment.');
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Preparing…';

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, items: [item], payment_method: selectedPaymentMethod }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong creating your order.');
      }

      const redirect = data.redirect;

      if (redirect.type === 'form') {
        // eSewa: build and auto-submit a hidden form with the signed fields
        // the backend generated — standard eSewa v2 redirect flow.
        const gatewayForm = document.createElement('form');
        gatewayForm.method = 'POST';
        gatewayForm.action = redirect.action;
        Object.entries(redirect.fields).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          gatewayForm.appendChild(input);
        });
        document.body.appendChild(gatewayForm);
        gatewayForm.submit();
      } else if (redirect.type === 'url') {
        // Khalti: redirect straight to the hosted payment page.
        window.location.href = redirect.url;
      } else {
        // Manual methods (bank / FonePay / cash on visit): no online charge yet —
        // send them to a page with instructions and their reference number.
        window.location.href = `booking-pending.html?ref=${data.order.transaction_uuid}`;
      }
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  updateSummary();

  // Prefill exam from ?exam=... query param (used by exam card links)
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('exam');
  if (preselect) {
    setTimeout(() => {
      if ([...examSelect.options].some(o => o.value === preselect)) {
        examSelect.value = preselect;
        updateSummary();
      }
    }, 300);
  }
});
