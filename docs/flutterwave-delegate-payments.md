# Flutterwave delegate payments (Stage 1)

Flutterwave Standard API **v3** is an optional second hosted gateway. Paystack remains the default.
Manual bank transfer/offline payments remain separate. This change creates no sponsor/exhibitor
checkout, changes no registration eligibility and adds no conference prices.

## Gateway boundary and security

- `PaymentService` selects from configured adapters. Initialization accepts `{currency, provider?}`;
  omitted provider means `PAYSTACK`. Verification and reconciliation use the persisted provider.
- The database supplies the price and snapshots the expected amount, currency and customer identity.
  Flutterwave amounts are converted to/from exact two-decimal major units only in the adapter.
- Callback supports `reference`, `trxref` and `tx_ref`. Redirect status and transaction ID cannot
  authorize payment. The existing backend reference verification route remains authoritative.
- Flutterwave `charge.completed` webhooks require a constant-time `verif-hash` comparison against
  the separately configured secret hash. The backend then independently verifies the transaction
  ID and checks the returned merchant reference against the local attempt before finalization.
- Finalization checks successful status, exact expected principal, charged amount covering that
  principal, currency and normalized email. It reuses the existing row locks, provider transaction
  uniqueness, one-authoritative-payment constraint, payment events and completion workflow.
- Existing Paystack raw-body HMAC-SHA512 verification and refund processing are preserved; each
  webhook handler rejects cross-provider references. No raw payment/card payloads are stored.

Official documentation used:
[Standard v3](https://developer.flutterwave.com/docs/flutterwave-standard-1),
[verification by reference](https://developer.flutterwave.com/reference/verify-transaction-with-tx_ref),
[transaction verification](https://developer.flutterwave.com/docs/transaction-verification),
[v3 webhook secret hash](https://developer.flutterwave.com/docs/webhooks).
The v4 HMAC webhook protocol is intentionally not used for this v3 integration.

## Attempts, uncertainty and retries

The existing unique active-attempt index remains **per registration across gateways**. Repeating
initialization with the same provider/currency returns its existing URL, including Flutterwave links
with no Paystack access code. Changing provider/currency while a checkout is unresolved conflicts.
Continuation-token retries are still restricted to a latest FAILED/ABANDONED attempt.

A definite initialization rejection can mark an attempt FAILED and allow a later retry/provider
switch. Transport errors, malformed responses, uncertain provider responses and persistence failures
leave the attempt reserved. INITIALIZED attempts no longer expire just because two minutes elapsed:
a paused process could still create a payable link. Dispatch/uncertainty is recorded in provider status.
Paystack transport and server errors now receive the same conservative treatment.

A Flutterwave failed charge is an observation about one charge, not proof the hosted link cannot
accept another payment. Therefore failed/pending charges normalize to unresolved PENDING; not-found
verification responses also do not release an attempt. Mismatches remain reserved and appear as
`verification_mismatch` in Admin provider status. Operators must investigate these cases with the
provider before arranging another payment; Stage 1 does not add an unsafe force-retry control or
an automatic cancellation/refund endpoint. The existing bounded reconciliation job claims only
configured online gateways (never MANUAL), and uses the persisted adapter for each attempt.

A late success after another payment wins becomes DUPLICATE_SUCCESS and does not issue another pass
or increase authoritative revenue. Email/pass side effects retain their existing idempotent ledgers.

## Sandbox configuration

Apply `20261017010000000_flutterwave-delegate-payments.ts` through the normal migration process in
a local/sandbox database. It extends provider/source/method constraints and preserves all financial
records and indexes. Rollback refuses while Flutterwave history exists; it never deletes payments.

Configure all three together in the backend environment only:

```dotenv
FLUTTERWAVE_SECRET_KEY=<Flutterwave sandbox secret key>
FLUTTERWAVE_WEBHOOK_SECRET_HASH=<independent random secret of at least 32 characters>
FLUTTERWAVE_CALLBACK_URL=http://localhost:5173/registration/payment/callback
```

The callback must use an approved `CLIENT_URL` origin and the exact callback path; production requires
HTTPS. All three absent disables Flutterwave. No frontend public key, encryption key or VITE secret
is needed. The UI offers both gateways; an unconfigured gateway fails safely with HTTP 503.

In the Flutterwave **test-mode** dashboard, configure a reachable HTTPS webhook URL ending in
`/api/payments/flutterwave/webhook`, set the identical secret hash and enable webhook retries.
Confirm this merchant account supports each currency before sandbox acceptance. No silent currency
conversion/fallback is performed. Existing Paystack configuration remains unchanged.

## Verification

Automated gateway requests use injected mocked HTTP only. The PostgreSQL acceptance harness asserts
that it is connected to `.private/flutterwave-stage1/cluster` on loopback port 55439, migrates a fresh
random schema, creates only synthetic registrations, and drops that schema afterward. Student price
fixtures exist only in that disposable schema; no Student pricing migration was added.

For a dedicated local Windows PostgreSQL installation, initialize a fresh cluster once:

```powershell
New-Item -ItemType Directory -Force .private/flutterwave-stage1
& 'C:/Program Files/PostgreSQL/18/bin/initdb.exe' -D .private/flutterwave-stage1/cluster -U flutterwave_test -A trust --encoding=UTF8 --no-locale
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D .private/flutterwave-stage1/cluster -l .private/flutterwave-stage1/postgres.log -o '-h 127.0.0.1 -p 55439' -w start
npm --prefix backend run test:payments:acceptance
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D .private/flutterwave-stage1/cluster -m fast -w stop
```

The local trust authentication is for this loopback-only disposable cluster, not deployment.
The harness does not consume an environment DATABASE_URL or real provider key.

Coverage includes default Paystack, Flutterwave USD/NGN, checkout reuse without access code,
cross-provider initialization races, blocked switching, independent webhook verification,
callback/webhook duplication, reference/email/principal/charged-amount/currency mismatches,
initialization timeouts and aging, failed/not-found outcomes, definitive rejection retries,
Student eligibility and test-only pricing, manual confirmation precedence, reconciliation and
rollback protection. Frontend tests exercise both gateways on verified Professional and eligible
Student screens, recovery selection, service payloads and all three callback reference formats.

## Changed files for Stage 1

Backend:

- `src/payments/payment.service.ts`, `payment.types.ts`, `providers/paystack.provider.ts`,
  `providers/flutterwave.provider.ts`
- `src/services/delegatePayment.service.ts`, `manualPayment.service.ts`
- `src/repositories/payment.repository.ts`, `manualPayment.repository.ts`
- `src/controllers/payment.controller.ts`, `registrationRecovery.controller.ts`
- `src/routes/payment.routes.ts`, `src/validators/payment.validator.ts`, `delegate.validator.ts`
- `src/middleware/flutterwaveWebhookSignature.middleware.ts`
- `src/types/payment.ts`, `src/config/env.ts`, `src/app.ts`, `src/server.ts`
- `migrations/20261017010000000_flutterwave-delegate-payments.ts`
- `test/flutterwave.test.ts`, `flutterwave.acceptance.ts`, `payment.test.ts`, `package.json`, `.env.example`

Public frontend:

- `src/components/common/PaymentProviderSelect.tsx`, `src/services/payment/paymentService.ts`
- `src/pages/registration/email-verification/EmailVerificationPage.tsx` and its test
- `src/pages/registration/recovery/RegistrationRecoveryPage.tsx` and its test
- `src/pages/registration/delegate/StudentEvidenceUploadPanel.tsx`
- `src/pages/registration/payment/PaymentCallbackPage.tsx`
- `src/test/paymentFlow.test.tsx`, `studentVerificationWorkflow.test.tsx`

Admin: `src/services/payment/paymentAdminService.ts`, `src/pages/admin/dashboard/SummarySection.tsx`.
Environment examples: `deploy/backend.env.example`, `deploy/backend.production.env.example`.
Documentation: this file and the updated initialization/retry notes in `docs/delegate-payments.md`.
Pre-existing unrelated workspace changes were preserved.

## Implementation validation (17 October 2026)

- Backend suite with two concurrent files: **452 passed, 1 skipped, 0 failed**. The skipped
  private-storage permission test is platform-specific on Windows.
- Fresh isolated PostgreSQL: **14 acceptance scenarios passed**, all gateway HTTP mocked.
- Public frontend: **84 passed**; Admin: **108 passed**, each with two Vitest workers.
- Public frontend, backend (including test sources), and Admin TypeScript checks passed.
- All three production builds passed. Frontend lint: **0 errors, 12 existing Fast Refresh warnings**.
- Initial unrestricted parallel suite runs hit resource-related timeouts; bounded reruns passed.
- No live payment request, deployment, production configuration update or non-isolated migration
  was performed. The dedicated local test PostgreSQL process was stopped after verification.
