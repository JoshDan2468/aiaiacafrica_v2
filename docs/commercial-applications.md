# Sponsor and Exhibitor applications (Milestone 4A)

Sponsor and Exhibitor submissions are organization-level commercial applications. They are not
Delegate registrations and never enter the Professional Delegate Paystack or Event Pass workflows.

## Commercial truth

PostgreSQL owns the active 2027 package catalogs. Public clients submit only a package code; the
repository resolves the active package and snapshots its code, name, `USD` currency, and minor-unit
price on the application. A `CONFIRMED` application is a business decision and does not represent a
payment or contribute to confirmed revenue.

An accidental retry is identified by event year, selected package, and normalized contact email. It
returns the existing public reference and does not create another application or acknowledgement.
The event year keeps future conference cycles independent.

## Workflow and access

The initial state is `SUBMITTED`. Authorized staff can move it to
`MORE_INFORMATION_REQUIRED`, `CONFIRMED`, or `DECLINED`; a more-information application can later be
confirmed or declined. Confirmed and declined records are terminal. Every decision locks the row in
a transaction and appends a history entry.

`SUPER_ADMIN`, `ADMIN`, and `REGISTRATION_MANAGER` have Sponsor and Exhibitor read/manage access.
Finance and Communications have neither application-decision permission in V1. Backend permission
middleware is authoritative.

## Notifications

Submission and decision transactions enqueue one notification tied uniquely to the history entry.
Delivery occurs after commit through the existing Mailjet abstraction. Failed work remains retryable,
claims are leased, and attempts stop after three. Applicant-visible reasons may be emailed; optional
confirmation notes are internal and are never included in applicant email.

Required production variables remain `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`,
`MAILJET_FROM_EMAIL`, and optionally `MAILJET_FROM_NAME`. Public submission limits can be adjusted
with `COMMERCIAL_APPLICATION_RATE_LIMIT_WINDOW_MS` and `COMMERCIAL_APPLICATION_RATE_LIMIT_MAX`.

## Deliberately deferred

Milestone 4A does not implement Sponsor/Exhibitor payment, invoicing, bank-transfer reconciliation,
delegate-pass allocation, exhibitor badges, booth assignment, contracts, CRM, or a public
more-information update portal. Staff follow-up for requested information is handled through the
commercial team in this version.
