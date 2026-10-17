# Delegate payment foundation

> Current Stage 1 multi-gateway behavior, uncertainty handling and sandbox setup are documented in
> [Flutterwave delegate payments](flutterwave-delegate-payments.md). The original milestone scope below
> is historical; Student eligibility, manual payments and reconciliation have since been added.

## Scope and business rule

This milestone allows an existing **Professional Delegate** registration to pay through Paystack.
The current conference-controlled prices are USD 1,500.00 (`150000` cents) or NGN ₦2,100,000
(`210000000` kobo). The organizer approved the fixed NGN conversion basis of ₦1,400/USD:
`1,500 × 1,400 = 2,100,000`.

Both prices are independent, authoritative server-side database records. Checkout performs no live
FX lookup or browser-side conversion. A future price or approved conversion basis must be applied
through a reviewed database migration rather than fetched from a market-rate service.

Sponsor, exhibitor, Student Delegate, refunds, manual overrides, settlement reconciliation,
invoicing, and accounting are outside this milestone.

## Architecture and security

```text
registration reference
  -> DelegatePaymentService
  -> registration + delegate_package_prices (trusted amount)
  -> payment_transactions snapshot
  -> PaymentService
  -> PaystackProvider
  -> hosted Paystack checkout
```

The browser sends a registration reference and requested supported currency only. It never sends
an authoritative amount. `DelegatePaymentService` loads the registration, Professional package,
and requested active price from PostgreSQL, then snapshots `PROFESSIONAL`, the selected currency,
and its current approved amount on the payment attempt before calling Paystack.

Paystack requires initialization from the backend, amounts in currency subunits, and a unique
reference. Its verification response must be checked for status and amount before value is
delivered. See the official [Transaction API](https://paystack.com/docs/api/transaction/) and
[Accept Payments guide](https://paystack.com/docs/payments/accept-payments/).

No card number, CVV, full authorization object, raw provider payload, or provider secret is stored.
Development logging contains method/path/status only and does not log request bodies or query
strings.

## Data model

- `delegate_package_prices`: unique `(package_id, currency)`, `USD | NGN`, positive minor-unit
  amount, and independent active flag. Professional USD and NGN are currently active and this table
  is authoritative for checkout.
- Legacy `delegate_packages.currency` and `price_minor` remain temporarily so the existing package
  API and registration UI keep working. They should be retired only in a separately reviewed
  compatibility migration.
- `payment_transactions`: one row per attempt, with provider reference, trusted snapshots, small
  state, safe checkout URL/access code, useful outcome fields, and confirmation-email state.
- `payment_events`: at most one meaningful initialized, confirmed, and verification-failed event
  per payment. It intentionally excludes provider noise and sensitive payloads.

Detailed attempt states are `INITIALIZED`, `PENDING`, `PAID`, `FAILED`, `ABANDONED`, and
`REVERSED`. A delegate registration stays `PENDING` after an attempt fails so another attempt may
be made. It changes to `PAID` only after trusted confirmation.

Pricing migrations never update `payment_transactions`. A payment initialized under an earlier
price retains its original currency and amount snapshot even after current package prices change.

## Initialization, retries, and concurrency

`POST /api/delegate-registrations/:reference/payment/initialize` accepts exactly:

```json
{ "currency": "USD" }
```

or:

```json
{ "currency": "NGN" }
```

Initialization additionally accepts optional `provider: "PAYSTACK" | "FLUTTERWAVE"`, defaulting to
`PAYSTACK`; the same option is supported by secure continuation retries. The service locks the
registration while resolving eligibility and creating an attempt. A partial
unique index permits only one `INITIALIZED` or `PENDING` attempt for a registration. A repeat call
returns an already-created hosted checkout when available; a simultaneous call while the provider
request is in flight gets a safe conflict response. Provider failure marks the attempt `FAILED`,
which permits a new server-generated reference on retry. A failed/abandoned attempt never changes
the registration to paid.

The provider call occurs after the database transaction so row locks are not held across network
I/O. Interrupted or uncertain initialization leaves an `INITIALIZED` row reserved for reconciliation.
Elapsed time alone does not abandon it: a paused process or lost response can still create a payable
checkout. Definitive initialization rejection can release an attempt; unknown outcomes cannot.

## Verification and webhook

`GET /api/payments/:reference/verify` loads the local snapshot and calls Paystack Verify. A success
is accepted only when all of these match:

- local and provider references;
- provider status `success`;
- exact integer minor-unit amount;
- exact currency;
- normalized customer email and registration email.

Finalization locks the payment and registration rows. Repeated verification or webhook delivery
sees the already-paid row and produces no second business event or email.

`POST /api/payments/paystack/webhook` is public but authenticates the exact raw JSON bytes with
HMAC-SHA512 and the backend Paystack secret key before parsing the event. This follows Paystack's
official [webhook signature guidance](https://paystack.com/docs/payments/webhooks/). The initial
milestone processes `charge.success`; unknown references and signed mismatches are acknowledged
without changing payment truth. Missing or invalid signatures receive `401`.

The callback page is user experience only. It reads the reference and asks the backend to verify;
query parameters can never mark a registration paid.

An attendee may close hosted checkout without reaching the callback. When Paystack is configured,
the API process also runs bounded reconciliation every five minutes. It claims unresolved attempts
that are at least two minutes old, verifies them with Paystack, and records an explicit `abandoned`
or `failed` provider status. The existing recovery workflow then emails a single-use, 30-minute
link to check the current registration/payment status and safely retry. A provider `pending` or
`ongoing` result never becomes `ABANDONED` by elapsed time alone; the attendee is not invited to
pay twice. Database row claims prevent duplicate processing across API processes, and the job
stops on process shutdown. Reconciliation is best-effort while the API is running; an outage
requires restoring the API and checking unresolved attempts in Admin. Attempts still unresolved
after the configured three reconciliation claims also require Admin investigation; elapsed time
alone never authorizes a retry.

## Confirmation email and Admin access

The first successful state transition starts a separately tracked completion workflow after the
database commit. That workflow issues one event pass, delivers its QR through the provider-neutral
Mailjet boundary, and sends configured oversight notifications. Failure is recorded independently
and logged with only safe identifiers and error types. Payment remains `PAID`. Replayed
verification/webhooks may safely recover a failed delivery but cannot issue a second pass or cause
unbounded email attempts. See [`payment-completion.md`](payment-completion.md).

`GET /api/admin/payments` and `GET /api/admin/payments/:reference` require `payments.read`.
`FINANCE` and `SUPER_ADMIN` have this permission. Other staff may still see the registration's
coarse payment status when their existing delegate permission allows it, but they do not gain full
financial records.

## Environment and Paystack test mode

Obtain a **test secret key** from the Paystack Dashboard test-mode API Keys & Webhooks area. Put it
only in the untracked `backend/.env`:

```env
PAYSTACK_SECRET_KEY=your-test-secret-key
PAYSTACK_CALLBACK_URL=http://localhost:5173/registration/payment/callback
```

There is no `PAYSTACK_WEBHOOK_SECRET`: Paystack signs webhooks with the same account secret key.
Never prefix either setting with `VITE_`, paste it into React, commit it, or include it in Postman
examples.

For a remotely reachable development webhook, use a secure tunnel and configure this test-mode URL
in Paystack:

```text
https://your-test-host.example/api/payments/paystack/webhook
```

Localhost cannot receive Paystack's server-to-server webhook. The browser callback may remain
localhost. Use only Paystack test instruments; for example, the official
[Test Payments guide](https://paystack.com/docs/payments/test-payments/) lists the reusable success
card `4084 0840 8408 4081`, any future expiry date, and CVV `408`. Never use real money or a live
key for development or automated tests.

Production dependency: **Confirm international/USD payment capability on the organizer's Paystack
business before enabling live USD checkout.** USD support in the architecture or Paystack's market
documentation does not prove that this specific business is enabled. A Paystack
`unsupported_currency` response must not be bypassed and must not silently convert a USD attempt
to NGN. NGN checkout remains an independent option.

## Postman/manual acceptance flow

1. Create a Professional Delegate with `POST /api/delegate-registrations`. Expect a generated
   registration reference and payment `PENDING`.
2. Send `POST /api/delegate-registrations/:reference/payment/initialize` with
   `{"currency":"USD"}`. Expect USD, `amountMinor: 150000`, an authorization URL, and a payment
   reference. Repeat with a separate eligible registration and `{"currency":"NGN"}`; expect NGN
   and `amountMinor: 210000000`.
3. Inspect each local row. Expect `INITIALIZED` or `PENDING` and the selected authoritative price:

   ```sql
   SELECT provider_reference, status, currency, amount_minor
   FROM payment_transactions
   WHERE provider_reference = 'the-returned-reference';
   ```

4. Open the returned Paystack **test** authorization URL.
5. Complete checkout with a Paystack test instrument.
6. Let Paystack return the browser to `/registration/payment/callback`.
7. Confirm the callback calls `GET /api/payments/:reference/verify`.
8. Inspect both records. Expect both to be `PAID`:

   ```sql
   SELECT pt.status AS payment_status, dr.payment_status AS registration_payment_status
   FROM payment_transactions pt
   JOIN delegate_registrations dr ON dr.id = pt.registration_id
   WHERE pt.provider_reference = 'the-returned-reference';
   ```

9. Sign in as a Finance Admin and open `/admin/payments`; confirm the transaction appears.
10. Sign in as a role without `payments.read`; `GET /api/admin/payments` must return `403`.
11. Repeat the verify request. It remains `PAID` with no duplicate effects.
12. Replay the same correctly signed webhook in a controlled test. It remains `PAID`, with one
    `PAYMENT_CONFIRMED` event and no duplicate confirmation email.
13. Use mocked-provider automated tests for amount mismatch. Expected: payment is not `PAID`.
14. Repeat with a currency mismatch. Expected: payment is not `PAID`.
15. Complete the flow independently for NGN. If USD returns Paystack `unsupported_currency`, record
    it as an organizer merchant-capability blocker and do not convert or retry the attempt as NGN.

Useful inspection queries:

```sql
SELECT dp.slug, dpp.currency, dpp.amount_minor, dpp.is_active
FROM delegate_package_prices dpp
JOIN delegate_packages dp ON dp.id = dpp.package_id;

SELECT event_type, created_at
FROM payment_events
WHERE payment_transaction_id = 'payment-uuid'
ORDER BY created_at;
```
