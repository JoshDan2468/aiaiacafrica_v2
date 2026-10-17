# Communications Center

The existing Admin, Express API, PostgreSQL campaign ledger, RBAC, audit log and Mailjet provider remain in place. No real emails were sent and no production data was changed during implementation. Bulk sending stays disabled by default.

## Staff workflow

1. Choose Marketing or Payment reminder, select a source audience and filters, and count/review the matching normalized, deduplicated addresses.
2. Compose plain-text content and an optional HTTPS CTA using the shared branded AIAIAC email layout. Preview it and save a draft. One-address test delivery remains an explicit authorized action; it was exercised only with fake providers during implementation.
3. Review the saved revision, recipient snapshot and purpose. Explicitly acknowledge the review, then confirm immediate dispatch or schedule between one minute and 90 days ahead. Scheduling uses the staff member's local time in the UI and UTC in storage.
4. View campaign history and per-recipient delivery activity. Scheduled campaigns can be cancelled before dispatch. Immediate confirmation authorizes the worker to send after activation; opening or saving a draft never sends.

`communications.read`, `.create`, `.manage` and `.send` are enforced by the existing backend permission policy. Mutations retain session authentication and mutation/CSRF security. Retries require both manage and send permission. The scheduled worker checks that the confirming staff account remains active and has send permission. A revoked account's campaign remains paused; authorized staff can investigate the campaign rather than automatically replacing its actor.

## Audiences and consent

Sources include Professional/Student delegates, sponsors/confirmed sponsors, exhibitors/confirmed exhibitors, abstract authors and active manual/import contacts. Existing source-specific registration, verification, payment, country, currency and abstract filters remain available.

Marketing requires a `communication_preferences` OPTED_IN record with evidence. Existing records default to UNKNOWN; privacy consent and an application alone do not create marketing permission. Staff may record evidence/source, opt out, suppress, or explicitly restore an address with evidence in Contacts & Audiences. Suppression and OPTED_OUT exclude addresses from Communications Center campaigns. Existing security, verification, payment, invitation and Event Pass transactional triggers are separate and unchanged.

Payment reminders require verified, eligible unpaid delegates and an active package price; Students must have approved verification. A registration is excluded if any server-side payment transaction is PAID. ABANDONED means the latest payment attempt has server status ABANDONED. Reminder audiences still honor suppression/opt-out and are checked again immediately before sending. Browser-provided payment status/amount is never used as payment evidence.

CSV import accepts `name,email` plus optional `organization,country,consent,consent_evidence,source`. Consent values are UNKNOWN, OPTED_IN or OPTED_OUT; OPTED_IN requires evidence. Files are limited to 75 KiB and 500 data rows. Invalid rows are reported; case-insensitive duplicates and existing system/manual contacts are skipped. Imports preserve existing consent/suppression, track source, and atomically audit committed writes. They do not send emails or create registrations/payments.

## Delivery safeguards and reporting

- Maximum 500 recipients, ten per claim, thirty attempts per fixed UTC minute shared across processes/campaigns in PostgreSQL.
- Confirmation checks both the reviewed draft revision and current audience fingerprint. Row locks and the unique campaign/email ledger prevent duplicate confirmation and overlapping claims.
- Consent/payment eligibility is rechecked at delivery. Newly ineligible recipients become SKIPPED.
- Definite Mailjet rejection is FAILED and can be explicitly retried up to three total attempts. Timeouts, malformed provider responses, interrupted claims and ambiguous outcomes become UNCERTAIN and cannot be retried automatically.
- SENT means provider acceptance, not inbox arrival. Authenticated Mailjet events record DELIVERED, OPENED, CLICKED, BOUNCED, BLOCKED, SPAM and UNSUBSCRIBED. Adverse events suppress matched addresses. Provider UUIDs and a campaign-only CustomID avoid numeric ID rounding and the callback-before-settlement race. Later acceptance/delivery cannot erase an adverse event.
- Marketing HTML/text includes signed unsubscribe links and Mailjet List-Unsubscribe/one-click headers. GET displays a confirmation and does not mutate preferences, so email scanners cannot unsubscribe someone by following a link. Signed POST is idempotent and suppresses only an address present in that campaign's ledger. Request/audit reporting does not persist raw signing tokens or provider error bodies.

## Configuration before live activation

The prepared migration `backend/migrations/20261008010000000_communication-safety.ts` was applied only to an isolated, disposable local PostgreSQL fixture database. Review and apply it through the existing test deployment process before deploying this code to an environment. Its rollback deliberately requires a reviewed data-preserving procedure because it stores consent/suppression and campaign history.

Keep `COMMUNICATIONS_BULK_SEND_ENABLED=false` until controlled verification and explicit operational activation. Configure the existing Mailjet sender/key settings plus:

| Variable | Requirement |
| --- | --- |
| COMMUNICATIONS_PUBLIC_API_URL | Public HTTPS API origin, e.g. https://api.aiaiacafrica.com |
| COMMUNICATIONS_UNSUBSCRIBE_SECRET | Independent persistent random secret, at least 32 characters; keep it stable for existing links |
| COMMUNICATIONS_MAILJET_WEBHOOK_SECRET | Independent random secret, at least 32 characters |

Configure Mailjet event tracking to the API's `/api/communications/mailjet/events` endpoint over HTTPS using Basic Authentication username `mailjet` and the configured webhook secret as its password. Register sent, bounce, blocked, spam and unsub events; open/click are optional. Single and grouped JSON events are supported. This follows the [Mailjet event tracking documentation](https://dev.mailjet.com/docs/email-api/webhooks/webhooks-overview). Never commit credential-bearing callback URLs.

Before enabling bulk delivery: verify the HTTPS unsubscribe GET/POST from a controlled test campaign; verify authenticated provider callbacks; record legitimate consent evidence; verify eligible reminder recipients and staff permissions; and approve the final campaign snapshot. Actual sender authentication, real inbox delivery and live event callbacks still require controlled operational verification. No provider webhooks or bulk flags were activated during implementation.

## Verification

Backend focused tests cover strict validation, RBAC/CSRF, signing/tampering, consent-aware CSV, disabled-worker behavior, dispatch-time skips, ambiguous outcomes and existing template behavior. Admin tests cover explicit final acknowledgement, purpose-aware reminders, permissions, consent evidence/source, suppression history and failure states.

Local-only PostgreSQL acceptance scripts are `backend/test/communications.acceptance.ts` and `backend/test/communication-safety.acceptance.ts`. Both reject any target other than `127.0.0.1:15440/communications_fixture`; the safety script resets communications fixture tables in that disposable database. They must never be pointed at deployed data. Providers record synthetic messages locally.

Completed checks: backend 291 passed / 1 skipped; Admin 80 passed. Backend, Admin and public frontend type checks and production builds passed. Admin lint has three existing warnings and public frontend lint has twelve existing warnings, with no errors. Both isolated PostgreSQL acceptance scripts passed. Fixture browser checks covered the composer, explicit acknowledgement while sending is disabled, and consent/suppression UI; scoped accessibility scans found no violations after the notice contrast fix, and the composer had no horizontal overflow at 390px. Screenshots and a concise evidence report are in `.private/communications-evidence/` (synthetic fixture data only).

## Audience structure update — 10 October 2026

Campaign purposes now include event announcements, delegate updates, sponsor outreach, exhibitor outreach, general marketing and payment reminders. Purpose describes the message; audience selects the contacts. All non-payment-reminder purposes retain recorded opt-in, suppression and unsubscribe requirements.

Everyone combines delegates, sponsor/exhibitor applications, abstract authors and active imported contacts. Combined delegate/sponsor/exhibitor audiences also include the matching prospective contact category. Registered-only, confirmed-only and prospective-only choices remain available. SQL normalizes and deduplicates addresses before the aggregate safety cap, so duplicate records in an earlier category cannot hide later eligible contacts.

CSV contacts can use optional `category`: `GENERAL_CONTACT`, `PROSPECTIVE_DELEGATE`, `PROSPECTIVE_SPONSOR` or `PROSPECTIVE_EXHIBITOR`. Imported contacts do not become registrations, approvals or paid attendees. Unknown consent remains excluded from non-reminder campaigns.

The API settings response advertises supported purposes and audiences. Admin blocks unsupported selections with a matching-release warning; older APIs without capability metadata use the original audiences and two original purposes. Drafts and previews remain available.

Release prerequisites: review the prepared prospect-category and purpose migrations, release the matching backend and Admin builds together, and configure the HTTPS unsubscribe origin and signing secret before non-reminder campaign activation. No deployment or production migrations were performed for this update. Local results: 304 backend tests passed / one skipped; 97 Admin tests passed; both typechecks and builds passed; focused Admin lint passed. Browser and isolated PostgreSQL evidence are recorded separately in `.private/communications-review/`.

## Audience totals — 10 October 2026

The audience-count response now separates `totalContacts` from the existing sendable `count`. Totals include distinct valid-email contacts from the selected supported source records before consent, unsubscribe and suppression exclusions. Source/category and registration filters still apply. Supported sources remain delegate registrations, sponsor applications, exhibitor applications, abstract authors and active manual/import contacts; staff accounts are not campaign contacts.

`excludedNoConsent`, `excludedOptedOut` and `excludedSuppressed` provide mutually exclusive explanations. Delivery, confirmation, fingerprinting and recipient previews still use the filtered recipient list. Directory totals cannot authorize sending, and the strict request validator rejects any browser attempt to enable internal directory mode. No consent records are automatically changed.

Admin uses “All platform contacts,” “Review audience,” “X contacts in this audience” and “Y recipients can receive this campaign.” Older APIs without total fields show only the recipient count and an update notice. Deployed API verification reported 24 platform contacts, zero opted-in announcement recipients, three sponsor contacts, and four eligible unpaid-registration reminder recipients. Counts reflect the inspection time and may change as records are added.

## Essential attendee updates — 10 October 2026

A new ESSENTIAL_EVENT_UPDATE purpose separates participation information from promotional announcements. Its permitted audiences are registered delegates, registered Professional Delegates and registered Student Delegates only. Server-side SQL requires a verified email and excludes rejected/cancelled registrations. Active imported contacts, prospects, sponsors, exhibitors and abstract-only contacts cannot be selected for this purpose. It does not infer or record marketing opt-in. Unsubscribed/suppressed addresses remain excluded. Recipient matching is rechecked at dispatch; existing RBAC, review fingerprint/revision, duplicate prevention and rate limits apply.

Use this purpose only for information needed for an existing delegate's participation (e.g. arrival/access/programme changes). General announcements, delegate promotion, sponsor/exhibitor outreach and imported prospects retain recorded opt-in and configured unsubscribe requirements. Existing campaigns are not reclassified, including existing EVENT_ANNOUNCEMENT and DELEGATE_UPDATE drafts.

A new additive purpose-constraint migration is prepared in backend/migrations/20261010040000000_essential-event-updates.ts. It has not been applied remotely. Release the matching backend before the Admin build; API capability metadata blocks the new purpose on older releases. No emails sent and no production records or consent changed during implementation.

## Unified message selection — 10 October 2026

New campaigns use three choices: Event update, Marketing and invitations, Payment reminders. Historical campaign purposes remain readable and retain their original rules; they are not automatically reclassified. Event update / Everyone involved combines verified active delegate registrations, current non-rejected/non-cancelled sponsor and exhibitor applications and non-rejected/non-withdrawn abstract records. It excludes manual/imported prospects, deduplicates emails and respects opt-out/suppression. Category-specific choices remain available. Use event updates only for operational conference participation information; promotional content belongs to Marketing.

Backend release 0.1.4-comms-20261010 is deployed, with the prepared essential-purpose migration applied after a validated backup. Existing secrets were preserved. Authenticated deployed counts: combined event update 13; sponsors 3; exhibitors 1; abstract authors 1; unpaid reminders 4. Combined totals can overlap across categories. Marketing directory still contains 24 contacts with zero recorded opt-ins. No campaigns sent or contacts/consent altered. Namecheap Admin publishing remains a manual step because hosting access was unavailable; updated local Admin uses the deployed API.
