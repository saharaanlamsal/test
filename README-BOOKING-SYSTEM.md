# BookMyTest — Online Booking System Setup Guide

Your site now has a real booking flow with a cart: customer adds one or more
exams → fills in their details once → pays the combined total via eSewa in a
single checkout → order is saved → you get one itemized email, the customer
gets one itemized confirmation email. This replaces "message us on WhatsApp
to book" with an actual on-site checkout (WhatsApp is still there for
support/questions).

**Important limitation, read this first:** No test provider (Pearson/PTE,
ETS/TOEFL & GRE, British Council/IDP for IELTS, GMAC for GMAT, etc.) offers a
public API for third parties to book real seats automatically. Nobody in this
industry can fully automate that part — including you. What this system
automates is the *intake and payment* step. You still manually confirm the
actual test date/center with the provider after each booking comes in, same
as before. The site is upfront about this with customers ("reservation fee",
"we'll confirm your exact slot").

---

## 1. What you have

```
bookmytest/
├── index.html, exams.html, contact.html    (existing pages, now link to booking.html)
├── booking.html            ← the cart + booking form + eSewa checkout
├── booking-success.html    ← shown after successful payment
├── booking-failed.html     ← shown if payment fails/cancels
├── css/booking.css
├── js/booking.js
└── backend/                ← THIS IS NEW: a real server, not just static files
    ├── server.js
    ├── db.js                (SQLite — stores every order + its exam line items)
    ├── esewa.js              (payment signature + verification)
    ├── mailer.js             (sends the two emails)
    ├── config.js             (exam list + reservation fee amounts — edit freely)
    ├── routes/orders.js     (accepts a cart of exams as one order)
    ├── routes/esewa.js
    ├── package.json
    └── .env.example          (copy this to .env and fill in real values)
```

The `backend/` folder is a Node.js server — it needs to run continuously
somewhere (Railway, Render, etc.), unlike the rest of your site which is
just static files.

---

## 2. Run it locally first (recommended before deploying)

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and at minimum set:
- `SMTP_USER` / `SMTP_PASS` — see step 4 below for how to get a Gmail app password
- `ADMIN_EMAIL` — where booking notifications go
- Leave `ESEWA_MODE=test` for now — this uses eSewa's public sandbox, no real money moves

Then:
```bash
node server.js
```
You should see: `BookMyTest backend running on port 4000 (eSewa mode: test)`

Now open `booking.html` in your browser (e.g. via VS Code Live Server). The
form will talk to `http://localhost:4000` automatically — that's already set
in `booking.html` and `booking-success.html`.

### Test payment (sandbox)
eSewa's test environment accepts these fake credentials — nothing is charged:
- eSewa ID: `9806800001` (or `9806800002`–`9806800005`)
- Password: `Nepal@123`
- MPIN: `1122` (token/OTP if asked: `123456`)

Complete a test booking end-to-end to confirm you receive both emails.

---

## 3. Deploy the backend (Railway)

1. Push the `backend/` folder to a GitHub repo (can be part of your main site repo, just point Railway at the `backend` subfolder).
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
3. Set the root directory to `backend` (Railway setting: "Root Directory").
4. Add all the variables from `.env.example` under Railway's "Variables" tab — **do not commit your real `.env` file to GitHub.**
5. Set `APP_BASE_URL` to the Railway-generated URL (e.g. `https://bookmytest-backend.up.railway.app`) — you'll get this after the first deploy, then update the variable and redeploy.
6. Set `SITE_BASE_URL` to wherever your actual website (`index.html` etc.) will be hosted.
7. **Attach a volume** in Railway (Settings → Volumes) mounted at `/app/data` so your SQLite booking database survives restarts/redeploys — without this, bookings would be lost on every redeploy.

## 4. Set up email sending (Gmail app password)

Regular Gmail passwords don't work for SMTP. Instead:
1. Go to https://myaccount.google.com/apppasswords (requires 2-Step Verification enabled on the account)
2. Generate an app password for "Mail"
3. Use that 16-character password as `SMTP_PASS`, and your Gmail address as both `SMTP_USER` and `ADMIN_EMAIL`

## 5. Point the frontend at your live backend

Once deployed, update these two lines (replace `http://localhost:4000` with your real Railway URL):
- `booking.html` → `<script>window.BOOKMYTEST_API_BASE = '...';</script>`
- `booking-success.html` → same line near the bottom

Then upload/redeploy your static site files as usual.

## 6. Go live with real eSewa payments

You'll need to register as an eSewa merchant (business registration required) to
get a production Merchant Code and Secret Key — this is a manual approval
process with eSewa, separate from anything I can automate. Once you have them:

In your Railway environment variables, set:
```
ESEWA_MODE=live
ESEWA_MERCHANT_CODE=<your real merchant code>
ESEWA_SECRET_KEY=<your real secret key>
```
No code changes needed — the switch is entirely in the environment variables.

---

## 7. Adjusting prices or exams

Edit `backend/config.js` — `EXAM_RESERVATION_FEE` controls what's charged at
checkout for each exam. The frontend automatically pulls this list, so you
never need to touch `booking.html` to change prices.

## 8. What happens to a booking after payment

1. Booking is saved with `payment_status: COMPLETE`, `booking_status: AWAITING_PROVIDER_CONFIRMATION`
2. You get an email with all the details
3. Customer gets a confirmation email
4. You confirm the real exam slot with the provider manually and follow up with the customer — same as your current process, just with cleaner intake.

Since there's no dashboard, your record of all bookings lives in the SQLite
database file (`backend/data/bookings.db`) as a backup — the email is your
day-to-day view. If you ever want a simple read-only page to browse past
bookings, that's a small addition we can make later.
