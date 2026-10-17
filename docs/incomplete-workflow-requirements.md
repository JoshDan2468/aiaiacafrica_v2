# Incomplete workflow requirements

Status: proposed requirements for organizer review, 8 October 2026. The organizer requested
requirements first. This document does not authorize implementation or define approved prices,
legal terms, eligibility rules, or provider settings.

## Current behavior

Public delegate, sponsor, exhibitor, abstract, and enquiry workflows already have distinct
backend boundaries. Retain these. The general participation section prepares a `mailto` draft;
it does not guarantee delivery or save a submission. The older temporary participation form
only changes local confirmation state. Do not extend either into a generic production workflow.

## Proposed workflows and decisions

| Workflow | Proposed information | Proposed Admin handling | Decisions required |
| --- | --- | --- | --- |
| Visitor | Name, email, phone, country, organization, purpose, event, consent | Separate visitor queue; review/approval history; reference and notifications | Free or paid access; eligibility; capacity; pass and check-in policy |
| Partner | Contact and organization details, partner category, collaboration proposal, relevant website, consent | Separate partner queue; assigned reviewer; request information; accept/decline history | Partner categories; approval permissions; attachments; agreement process |
| Media | Contact, publication/outlet, role, coverage proposal, organization website, consent | Separate media queue and accreditation decision history | Required evidence; verification; accreditation rights; capacity; pass policy |
| General participation enquiry | Name, email, organization, subject, message, consent | Saved enquiry with reference, status, reviewer response history | Use existing general-enquiry workflow or define a distinct participation enquiry; clarify corporate requests |

Each implemented category must own its form, schema, browser service, backend validation,
Admin handling, and report domain. Collect only approved fields. Consent wording and retention
must be approved. Identity verification and access rights remain server-side decisions.

## Shared acceptance criteria

- A valid submission persists exactly once, returns a reference, and states whether email delivery succeeded.
- Invalid requests fail without saving; rate limits and duplicate handling are defined.
- Admin APIs require category permissions; client route guards are presentation only.
- Review transitions record actor, time, previous/new status, and reason; response links are private and expire.
- Email acknowledgement, recovery, review notifications, reporting/export, and retention are defined separately per category.
- Direct links, refresh, Back/Forward, and mobile forms work on deployed hosting.
- Approved categories have focused API/UI tests and an end-to-end acceptance record.

## Student payment

Student pricing is currently unconfirmed. Obtain organizer-approved amounts/currencies and the
pricing activation date before enabling checkout. Student payment must require both verified
email ownership and approved academic review. The backend computes price; never accept browser
amounts or claimed payment success. Confirm evidence scanning, private downloads, review
permissions, price selection, payment verification, and eventual pass issuance together.

## Legal pages

The footer currently links Privacy Policy and Terms to About. Obtain approved policy text,
organization/controller details, effective dates, retention/contact details, payment/refund
terms, and publishing URLs. Then create dedicated routes and update footer/consent links.
Do not invent legal content or present an unfinished page as an approved policy.

## Local backend operation

The local `.env` may contain production configuration; do not disable certificate verification
to make that database connection work. For an independent local environment use the documented
Docker Compose backend/PostgreSQL/ClamAV stack and its verified database certificates. For
remote API development retain the frontend Vite proxy setup. Decide whether local API startup
should use a separate local database before changing credentials or connection settings.

## Integration acceptance still required

Record live email receipt and verification, Paystack test checkout/callback/webhook and server
verification, Student evidence upload/scanning/review, authenticated Admin permissions and
session continuity, and QR pass check-in/duplicate handling. A health check or passing unit test
does not count as provider/browser verification. Earlier synthetic QA is useful but does not
prove inbox delivery or a completed payment on the current public deployment.
