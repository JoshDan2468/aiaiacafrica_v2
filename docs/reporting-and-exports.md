# Milestone 5A — Reporting & Exports

The Admin Reporting & Exports page reads authoritative PostgreSQL records through a separate
route → validator → controller → service → repository path. It does not modify or copy Delegate,
Student, payment, Sponsor, Exhibitor, Abstract, or Enquiry business state. The only new table is
`report_export_audit`, created by migration `20260924000000000_report-export-audit.ts`.

`GET /api/admin/reports/summary` provides a management summary to financial-reporting roles.
`GET /api/admin/reports/:domain` previews one of `delegates`, `students`, `payments`, `sponsors`,
`exhibitors`, `abstracts`, or `enquiries`. Preview filters are validated and server-paginated
(maximum 100 rows/page): `dateFrom`, `dateTo`, domain-specific `status`, Delegate `paymentStatus`,
payment `currency`, applicable `package`, and Enquiry `category`. A supplied date pair is limited
to 366 days. Dates use Lagos calendar boundaries and are displayed in UTC.

`POST /api/admin/reports/:domain/export` applies the same validated filters, authentication,
domain permission, `reports.export`, and Admin CSRF/origin checks. It generates UTF-8 CSV on the
server in 500-row batches, capped at 50,000 rows per request. Columns have stable order and
human-readable headers; only explicit safe projections are exported. User-controlled values
with spreadsheet-formula prefixes are neutralized before CSV escaping. No payment credentials,
Student evidence/storage paths, Abstract recovery credentials, or Enquiry internal notes are
selected. The export audit stores actor, domain, validated filters, CSV format, and timestamp,
never the file or its rows. A denied/oversized request creates no audit row.

The management summary counts Professional registrations, Student verification states,
commercial applications, Abstracts, and open Enquiries. Revenue sums only `PAID`
`payment_transactions`, with NGN and USD separate; there is no conversion or combined total.

Backend RBAC is authoritative: Super Admin has all reports and exports; Admin has operational
reports/exports but no financial report; Finance has payment report/export and the management
summary; Registration Manager has its existing operational domains and exports, but no payment
report; Communications can preview Enquiries only, without export or financial access.
Frontend category visibility mirrors this policy but is not a security boundary.

V1 limitations: CSV only; PDF management summary is deferred to avoid a new document-generation
dependency. The 50,000-row cap requires narrowing filters for larger datasets. Batch exports are
operational snapshots, not a transactionally frozen point-in-time archive, so records updated
during export may affect later batches. No scheduled reports, emailed exports, XLSX, warehouse,
currency conversion, refund accounting, or custom SQL builder are included.
