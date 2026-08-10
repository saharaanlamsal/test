// BookMyTest — booking form + cart logic
const API_BASE =
    window.BOOKMYTEST_API_BASE ||
    (window.location.port === '5500' ? 'http://localhost:4001' : '');

let examFees = {};
let cart = [];

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const examSelect = document.getElementById('exam');
  const slotSelect = document.getElementById('slot');
  const errorBox = document.getElementById('formError');
  const submitBtn = document.getElementById('payBtn');
  const addBtn = document.getElementById('addToCartBtn');
  const cartList = document.getElementById('cartList');
  const cartEmpty = document.getElementById('cartEmpty');
  const sumAmount = document.getElementById('sumAmount');
  const cartCountBadge = document.getElementById('cartCount');

  // Pull exam names/prices/slots from the backend so the frontend never drifts
  // out of sync with what the server will actually charge.
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    const cfg = await res.json();
    examFees = cfg.examFees;

    examSelect.innerHTML = '<option value="" disabled selected>Select an exam</option>' +
      Object.keys(examFees).map(name => `<option value="${name}">${name} — NPR ${examFees[name].toLocaleString()}</option>`).join('');

    slotSelect.innerHTML = '<option value="" disabled selected>Select a time slot</option>' +
      cfg.timeSlots.map(s => `<option value="${s}">${s}</option>`).join('');
  } catch (e) {
    showError('Could not reach the booking server. Please try again shortly, or book via WhatsApp instead.');
    addBtn.disabled = true;
    submitBtn.disabled = true;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function clearError() {
    errorBox.classList.remove('show');
  }

  function renderCart() {
    if (cart.length === 0) {
      cartList.innerHTML = '';
      cartEmpty.style.display = 'block';
      submitBtn.disabled = true;
    } else {
      cartEmpty.style.display = 'none';
      cartList.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <strong>${item.exam}</strong>
            <span>${item.preferred_date} · ${item.preferred_slot}${item.test_center_city ? ' · ' + item.test_center_city : ''}</span>
          </div>
          <div class="cart-item-right">
            <span class="cart-item-price">NPR ${item.amount.toLocaleString()}</span>
            <button type="button" class="cart-remove" data-idx="${idx}" aria-label="Remove">&times;</button>
          </div>
        </div>
      `).join('');
      submitBtn.disabled = false;
    }

    const total = cart.reduce((sum, item) => sum + item.amount, 0);
    sumAmount.textContent = total.toLocaleString();
    if (cartCountBadge) {
      cartCountBadge.textContent = cart.length;
      cartCountBadge.style.display = cart.length ? 'inline-flex' : 'none';
    }

    cartList.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.idx), 1);
        renderCart();
      });
    });
  }

  addBtn.addEventListener('click', () => {
    clearError();
    const exam = examSelect.value;
    const date = document.getElementById('preferred_date').value;
    const slot = slotSelect.value;
    const city = document.getElementById('test_center_city').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!exam || !date || !slot) {
      showError('Please select an exam, date, and time slot before adding to cart.');
      return;
    }

    cart.push({
      exam,
      preferred_date: date,
      preferred_slot: slot,
      test_center_city: city,
      notes,
      amount: examFees[exam],
    });
    renderCart();

    // Reset the "add item" mini-form so the person can add another exam cleanly.
    examSelect.value = '';
    document.getElementById('preferred_date').value = '';
    slotSelect.value = '';
    document.getElementById('test_center_city').value = '';
    document.getElementById('notes').value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    if (cart.length === 0) {
      showError('Your cart is empty — add at least one exam before checking out.');
      return;
    }

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
    submitBtn.textContent = 'Preparing payment…';

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, items: cart }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong creating your order.');
      }

      // Build and auto-submit a hidden form to eSewa with the signed fields
      // the backend generated — standard eSewa v2 redirect flow.
      const esewaForm = document.createElement('form');
      esewaForm.method = 'POST';
      esewaForm.action = data.esewa.action;
      Object.entries(data.esewa.fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        esewaForm.appendChild(input);
      });
      document.body.appendChild(esewaForm);
      esewaForm.submit();
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay with eSewa & Confirm Booking';
    }
  });

  renderCart();

  // Prefill exam from ?exam=... query param (used by exam card links)
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('exam');
  if (preselect) {
    setTimeout(() => {
      if ([...examSelect.options].some(o => o.value === preselect)) {
        examSelect.value = preselect;
      }
    }, 300);
  }
});
