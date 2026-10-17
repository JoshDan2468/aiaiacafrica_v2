# Communications Centre: Contacts & Audiences (Step 1)

The Contacts page extends the existing Communications Centre at
`/admin/communications/contacts`. It is a directory and recipient-source foundation, not a
campaign sender. Existing campaign creation, audience calculation, delivery, and email policies
are unchanged.

## Sources and storage

The backend projects contacts at read time from the authoritative 2027 delegate registrations,
sponsor applications, exhibitor applications, and abstract submissions. Delegate package type
distinguishes professional and student contacts. It does not copy these records into a second
table. General enquiries are excluded because an enquiry is not a registration or email consent.

Migration `20261003010000000_communication-manual-contacts.ts` adds only
`communication_manual_contacts` for legitimate contacts entered manually or imported from CSV.
It records the source (`MANUAL` or `IMPORT`), creator, status, and timestamps. It has no foreign
key into delegate, payment, application, or Event Pass records and no trigger creating such
records.

The directory returns one row per normalized email. If a person appears in multiple system
sources, the row lists all corresponding audience types; an authoritative system record is
preferred for its display fields. If a manual contact later matches a system record, the system
record is displayed. Add/import checks all configured system sources and manual contacts before
insertion; a unique normalized-email constraint guards concurrent manual inserts.

## API and import

The existing Communications router exposes:

- `GET /api/admin/communications/contacts` with page, limit, search, type, and source filters.
- `POST /api/admin/communications/contacts` for a manual contact.
- `POST /api/admin/communications/contacts/import` with a CSV string.

CSV requires `name,email`, optionally `organization,country` (also accepts `company` or
`organisation` as a header alias). The server limits the payload to 75 KiB and 500 data rows,
handles quoted cells, validates all contact fields, lowercases and trims email addresses, and
returns counts for imported, skipped duplicate, and invalid rows with up to 20 row errors.
Existing records are never overwritten. The frontend file-size check is an early user-facing
check; server validation is authoritative.

The router inherits session authentication and `communications.read` for list access.
Add/import require `communications.manage`, the existing mutation security middleware, and an
import-specific rate limit. Existing `SUPER_ADMIN`, `ADMIN`, and `COMMUNICATIONS` role policy
grants those permissions; `FINANCE` and `REGISTRATION_MANAGER` do not.

## Step 2 boundary

Being listed in the directory does **not** establish permission to receive a campaign. The
existing bulk-send gate and transactional email paths are untouched. Step 2 must define consent,
suppression/opt-out, campaign recipient selection, and audit rules before using manual/import
contacts for outbound messaging.
