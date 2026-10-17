# Flutterwave Standard v3 sandbox checkout acceptance

Date: 17 October 2026. Scope: delegate registrations only. No live credentials, real-money
transaction, production database, production setting, public tunnel or deployment was used.

## Result

A Flutterwave hosted **Test Mode** card checkout completed through PIN and OTP, returned to
`http://localhost:5173/registration/payment/callback`, and was independently verified by the backend.

- Registration: `AIAIAC-DEL-B5T2FCZY`
- Payment: `AIAIAC-PAY-0784C99047674AEE04FB9907`
- Flutterwave test transaction: `10558152`
- Authoritative amount: NGN 2,100,000.00 (210000000 minor units), unchanged database pricing
- Registration and payment status: PAID; financial authority: AUTHORITATIVE
- Event passes: one; PAYMENT_CONFIRMED events: one
- Unsigned local webhook: HTTP 401
- Two authenticated local webhook replays: HTTP 200, no additional pass or confirmation event

Evidence is retained privately in `.private/flutterwave-sandbox/sandbox-checkout-result.json` and
`payment-confirmed.png`. Neither contains provider credentials or card details.

## Fix made during the actual sandbox run

Flutterwave returned a successful hosted link on `checkout-v2.dev-flutterwave.com`. The original
adapter rejected it because its allowlist covered only `checkout.flutterwave.com`.

The adapter now accepts that exact sandbox hostname **only with FLWSECK_TEST credentials**.
Live credentials still reject it. HTTPS, absence of URL credentials and default HTTPS port are
required. Unknown/lookalike hosts remain rejected. The regression test covers these cases.

Changed source: `backend/src/payments/providers/flutterwave.provider.ts`.
Changed test: `backend/test/flutterwave.test.ts`.

The sandbox hostname also appears in Flutterwave's official documentation:
https://developer.flutterwave.com/docs/zambia-mobile-money
Official test cards: https://developer.flutterwave.com/docs/testing

## Customer identity limitation observed

The simulator returned a different customer email for the initial synthetic delegate even though
reference, successful status, amount and currency matched. Both verification endpoints agreed.
The app correctly left that payment unresolved as `verification_mismatch`; it was never marked PAID.

The happy-path test therefore used a **separate isolated registration fixture matching the
simulator's returned identity before initialization**. That fixture went through the normal token
verification service and browser verification route. No customer comparison, eligibility rule,
pricing rule or finalizer was relaxed, and no existing registration's email was edited.

Email verification links for these synthetic registrations were captured privately through an
in-process test sender; no real ownership-verification email was sent. This proves the token and
application flow, not real email delivery or arbitrary-customer email preservation by the simulator.
The other uncertain/mismatched attempts are retained in the isolated database for audit; none was
reset or replaced to force success.

## Enabled locally

The dedicated sandbox backend was started with `--allow-sandbox-payments`. Its fetch guard permits
only Flutterwave HTTPS /v3/ calls outside loopback. Paystack, Mailjet, AI and bulk communication
remain disabled. The frontend uses sandbox mode and the isolated database remains on port 55440.
Use the dedicated local launchers, not the ordinary dev commands; the original local configuration
was deliberately preserved. Secrets and launchers remain ignored and outside deployment artifacts.

## Remaining release gates

1. Configure the Flutterwave dashboard webhook URL and matching secret hash for the intended
   environment, enable retries, and verify **real server-to-server delivery** over public HTTPS.
   The successful webhook checks above were authenticated local replays; no public delivery is claimed.
2. Enable the approved production email provider and verify email ownership links and payment/Event
   Pass delivery. The sandbox intentionally has no sender; confirmation email state is FAILED while
   the payment correctly remains PAID and the pass exists.
3. Confirm the provider's Test Mode customer substitution with Flutterwave, or obtain a sandbox test
   flow that preserves arbitrary submitted customer emails. Do not add an identity bypass.
4. On the live server, apply the reviewed migrations before enabling Flutterwave and deploy the
   backend and public frontend builds. Preserve existing Paystack/manual configuration and records.
5. Configure backend-only **live** Flutterwave credentials, an independent strong live webhook hash,
   and the real HTTPS public frontend callback. Never deploy the ignored sandbox config or database.
   Confirm merchant activation and enabled currencies with Flutterwave. No silent currency fallback.

The code can be reviewed and pushed independently, but these gates must be completed before enabling
real-money Flutterwave checkout. No push, commit or deployment was performed in this task.
## Validation after the hostname fix

- Backend suite under the isolated development test configuration: **453 passed, 1 skipped, 0 failed**.
  The skipped filesystem-permissions test is Windows-specific. A first run with NODE_ENV=test hit
  the health test's development-mode expectation; rerunning with the expected mode passed.
- Focused payment/provider suite: **47 passed**.
- Backend and public frontend TypeScript checks and production builds passed.
- Public frontend lint: **0 errors, 12 existing Fast Refresh warnings**.
- Browser simulator path: registration/token verification, NGN selection, Flutterwave hosted card
  checkout, PIN, OTP, tx_ref callback, independent API verification and authoritative PAID persistence.
- Existing Paystack/manual tests remain in the passing backend suite. Existing non-sandbox payment
  records and production settings were not accessed or modified.
