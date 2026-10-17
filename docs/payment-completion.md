# Payment completion, event passes, and Admin overview

## Completion boundary

Paystack verification remains the only path to payment truth. The existing finalizer first commits
the payment transaction, delegate registration state, and `PAYMENT_CONFIRMED` event. Only then does
`PaymentCompletionService` run. Mailjet errors are contained by this boundary and cannot reverse or
delay a PAID financial record.

Callback verification, signed webhook delivery, repeat verification, and recovery all enter the
same completion service. PostgreSQL row locks and uniqueness constraints claim work before email is
sent. One registration has one `delegate_event_passes` row; each configured Admin has one
`payment_admin_notifications` row per payment. Delegate and Admin deliveries are independently
retryable up to three attempts, including stale PENDING claim recovery after ten minutes.

## Event-pass credential

The QR payload is an opaque `AIAIAC-PASS-` credential containing 256 random bits. PostgreSQL stores
only its SHA-256 hash. It does not contain a delegate email or phone, amount, database UUID,
Paystack reference/access code/secret, or session data. A failed delivery retry rotates the bearer
credential on the same pass row, so only the newest pass can later validate.

The pass records its registration, ACTIVE/REVOKED status, issue time, nullable future check-in time,
and delivery state. A future check-in service can hash a scanned credential and validate the pass,
registration, PAID state, active status, and `checked_in_at`; that scanner is intentionally not part
of this milestone.

## Email and oversight

The delegate email names the AIAIAC 2027 Conference & Innovation Showcase, 22–23 June 2027 in
Lagos, Nigeria. It uses the immutable payment transaction currency and amount, includes the
Professional Delegate package and safe references, and embeds the QR as a Mailjet inline PNG.

Oversight recipients are active Admins whose role is listed in `PAYMENT_NOTIFICATION_ROLES`. The
default is `SUPER_ADMIN`; the only other accepted role is `FINANCE`. This prevents broadcasting
financial events to every Admin. Configure both with:

```env
PAYMENT_NOTIFICATION_ROLES=SUPER_ADMIN,FINANCE
```

## Live overview

`GET /api/admin/overview` requires an authenticated role with `registrations.read`. PostgreSQL
computes total, PAID, and PENDING registration counts without joining payment attempts. Separate
subqueries sum only PAID NGN and PAID USD transaction snapshots. The API never converts or combines
the currencies. Sponsor, exhibitor, and abstract values remain zero until their real modules exist.

Recent Activity is limited to authoritative payment events and selected Admin audit actions. It
contains only safe registration references and generic Admin-action summaries.

Finance or Super Admin can use `POST /api/admin/payments/:reference/completion/retry` (or the
payment-detail action) to recover a previously PAID record whose pass/notification delivery did not
complete. The route requires `payments.manage` and the existing Admin mutation security checks; it
never asks Paystack to charge again and remains subject to the same one-pass/three-attempt claims.

## Fresh NGN Paystack Test Mode acceptance

1. Configure `DATABASE_URL`, a Paystack **test** secret, Mailjet credentials and sender, and active
   Super Admin email. Apply pending migrations with `npm --prefix backend run migration:up`.
2. Start the API and frontend from the repository root with `npm run dev:backend` and
   `npm run dev:frontend`.
3. Submit a fresh Professional Delegate registration with a new email. Record the generated
   `AIAIAC-DEL-...` reference.
4. Select NGN. Confirm the backend response shows NGN and `amountMinor: 210000000`, then open the
   returned Paystack Test Mode authorization URL.
5. Complete the test payment and allow Paystack to return to the callback page. Confirm the page
   reports payment confirmed.
6. In PostgreSQL, verify the payment and registration are PAID and exactly one pass exists:

   ```sql
   SELECT pt.provider_reference, pt.status, pt.currency, pt.amount_minor,
          dr.reference, dr.payment_status, dep.status AS pass_status,
          dep.delivery_status
   FROM payment_transactions pt
   JOIN delegate_registrations dr ON dr.id = pt.registration_id
   LEFT JOIN delegate_event_passes dep ON dep.registration_id = dr.id
   WHERE dr.reference = 'AIAIAC-DEL-YOURREF';
   ```

7. Sign in as Finance or Super Admin. Confirm Admin → Payments shows ₦2,100,000 NGN and Admin →
   Delegates shows PAID.
8. Open Admin → Overview. Confirm Total Registrations and Paid Registrations increased, Pending
   Payments reflects current registrations, NGN Revenue increased by ₦2,100,000, and USD Revenue
   did not change.
9. Confirm the delegate receives one email with the exact conference information, Professional
   Delegate, ₦2,100,000 NGN, and a visible QR pass. Confirm an active configured Super Admin (and
   Finance only if configured) receives the safe payment notification.
10. Request the same verification URL again and, if available, allow the signed webhook to replay.
    Confirm the transaction remains PAID, the pass-row count remains one, and no second successful
    delegate pass email is sent.
11. Inspect safe event history for `PAYMENT_CONFIRMED`, `EVENT_PASS_ISSUED`,
    `DELEGATE_CONFIRMATION_SENT`, and `ADMIN_PAYMENT_NOTIFICATION_SENT`. Failed delivery tests should
    produce the corresponding FAILED event without changing payment state.

Mailjet delivery is synchronous and bounded in the request-side recovery path; there is no queue or
scheduled reconciliation worker yet. A failed delivery becomes retryable when the same paid payment
is verified again, up to three attempts. Event-day scanner/check-in, refunds, Reporting & Exports,
and Student Delegate payment remain out of scope.
