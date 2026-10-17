# AIAIAC Africa 2027 — CEO Demo Guide

Use a local/staging environment and one preselected safe demo registration. Do not make a real charge or
send a bulk campaign.

## Before the meeting

- Start the frontend and backend; confirm `/api/ready` is healthy.
- Sign in with a demo Super Admin account.
- Record one safe Professional registration reference with a confirmed test/synthetic payment and Event
  Pass. Keep a second unpaid/failed demo registration for the recovery screen.
- Confirm the paid record appears in Delegates, Payments, Overview and Reports.
- Keep a safe QR available, or use manual lookup if physical HTTPS camera testing is unavailable.
- Keep Communications bulk sending disabled.

## 10-minute demonstration

1. **Conference website** — open the public home page and Registration hub.
2. **Delegate registration** — show the Professional form and explain that the server creates the
   registration reference before payment.
3. **Email verification** — show the unverified confirmation, then the verified state; payment is hidden
   until ownership is confirmed.
4. **Payment** — show USD/NGN selection and explain that PostgreSQL, not the browser, supplies the price.
   Use an existing test/synthetic paid record; do not pay again.
5. **Confirmation and Event Pass** — show the PAID callback/confirmation concept and safe QR pass.
6. **Admin Delegate record** — locate the same reference in Delegate Directory.
7. **Admin Payment record** — show the authoritative transaction, method, amount and confirmation state.
8. **Overview** — show registration totals and separate NGN/USD confirmed revenue.
9. **Event Check-in** — validate/lookup the attendee, review the safe projection, confirm once, then show
   “Already checked in” on repeat.
10. **Communications Centre** — show audience filters, authoritative count, preview, draft and delivery
    ledger. Do not confirm a production send.
11. **Reports** — show server-filtered preview and the management summary; explain that revenue counts only
    the authoritative PAID transaction.
12. **Close** — state that application acceptance passed, while production infrastructure/load, physical
    camera, Student storage/scanner and live-provider checks remain controlled launch conditions.

## Safe fallback

If a live local dependency is unavailable, use the P0.10 browser-acceptance screenshots for Overview and
Check-in. Never substitute a live Paystack charge or bulk email merely to keep the demo moving.
