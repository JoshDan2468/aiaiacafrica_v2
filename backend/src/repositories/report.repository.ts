import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDatabasePool } from "../config/database";
import type { DatabaseExecutor } from "../types/database";
import type {
  ReportColumn,
  ReportDomain,
  ReportFilters,
  ReportRow,
  ReportSummary,
} from "../types/report";
import { studentVerificationStatuses } from "../types/studentVerification";

interface Definition {
  readonly columns: readonly ReportColumn[];
  readonly select: string;
  readonly from: string;
  readonly date: string;
  readonly reference: string;
  readonly base?: string;
  readonly status: string;
  readonly paymentStatus?: string;
  readonly currency?: string;
  readonly package?: string;
  readonly category?: string;
}

const col = (key: string, label: string): ReportColumn => ({ key, label });
const utc = (expression: string) =>
  `to_char(${expression} AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') || ' UTC'`;
const money = (expression: string) =>
  `to_char(${expression}::numeric / 100,'FM999999999999999990.00')`;

const definitions: Record<ReportDomain, Definition> = {
  delegates: {
    columns: [
      col("reference", "Registration Reference"),
      col("name", "Delegate Name"),
      col("email", "Email"),
      col("phone", "Phone"),
      col("company", "Company"),
      col("jobTitle", "Job Title"),
      col("country", "Country"),
      col("registrationStatus", "Registration Status"),
      col("paymentStatus", "Payment Status"),
      col("emailVerificationStatus", "Email Verification Status"),
      col("financialAuthority", "Financial Authority"),
      col("providerStatus", "Provider Status"),
      col("actionRequired", "Action Required"),
      col("registrationDate", "Registration Date"),
    ],
    select: `dr.reference AS "reference", concat_ws(' ',dr.first_name,dr.last_name) AS "name",
      dr.email AS "email",dr.mobile AS "phone",dr.company_name AS "company",dr.job_title AS "jobTitle",
      dr.country AS "country",dr.registration_status AS "registrationStatus",dr.payment_status AS "paymentStatus",
      dr.email_verification_status AS "emailVerificationStatus",
      ${utc("dr.submitted_at")} AS "registrationDate"`,
    from: "delegate_registrations dr",
    date: "dr.submitted_at",
    reference: "dr.reference",
    base: "dr.package_type_snapshot='PROFESSIONAL'",
    status: "dr.registration_status",
    paymentStatus: "dr.payment_status",
  },
  students: {
    columns: [
      col("reference", "Registration Reference"),
      col("name", "Delegate Name"),
      col("email", "Email"),
      col("institution", "Institution"),
      col("institutionCountry", "Institution Country"),
      col("programme", "Programme / Course"),
      col("graduationYear", "Expected Graduation Year"),
      col("verificationStatus", "Verification Status"),
      col("emailVerificationStatus", "Email Verification Status"),
      col("applicationDate", "Application Date"),
      col("reviewDate", "Review Date"),
    ],
    select: `dr.reference AS "reference",concat_ws(' ',dr.first_name,dr.last_name) AS "name",dr.email AS "email",
      sv.institution_name AS "institution",sv.institution_country AS "institutionCountry",
      sv.programme_of_study AS "programme",sv.expected_graduation_year::text AS "graduationYear",
      sv.status AS "verificationStatus",dr.email_verification_status AS "emailVerificationStatus",
      ${utc("sv.created_at")} AS "applicationDate",
      CASE WHEN sv.reviewed_at IS NULL THEN NULL ELSE ${utc("sv.reviewed_at")} END AS "reviewDate"`,
    from: "student_verifications sv JOIN delegate_registrations dr ON dr.id=sv.registration_id",
    date: "sv.created_at",
    reference: "dr.reference",
    status: "sv.status",
  },
  payments: {
    columns: [
      col("paymentReference", "Payment Reference"),
      col("registrationReference", "Registration Reference"),
      col("delegate", "Delegate / Customer"),
      col("category", "Delegate Category"),
      col("currency", "Currency"),
      col("amount", "Amount"),
      col("paymentStatus", "Payment Status"),
      col("paymentSource", "Payment Source"),
      col("paymentMethod", "Payment Method"),
      col("externalReference", "External Reference"),
      col("paymentDate", "Payment / Confirmation Date"),
    ],
    select: `pt.provider_reference AS "paymentReference",dr.reference AS "registrationReference",
      concat_ws(' ',dr.first_name,dr.last_name) AS "delegate",
      CASE pt.package_code_snapshot WHEN 'STUDENT' THEN 'Student Delegate'
        ELSE 'Professional Delegate' END AS "category",pt.currency AS "currency",
      pt.currency || ' ' || ${money("pt.amount_minor")} AS "amount",pt.status AS "paymentStatus",
      pt.financial_authority AS "financialAuthority",COALESCE(pt.provider_status,'') AS "providerStatus",
      COALESCE(pt.reconciliation_reason,pt.failure_reason,'') AS "actionRequired",
      pt.payment_source AS "paymentSource",pt.payment_method AS "paymentMethod",
      COALESCE(pt.external_reference,'') AS "externalReference",
      ${utc("COALESCE(pt.paid_at,pt.payment_date,pt.created_at)")} AS "paymentDate"`,
    from: "payment_transactions pt JOIN delegate_registrations dr ON dr.id=pt.registration_id",
    date: "pt.created_at",
    reference: "pt.provider_reference",
    status: "pt.status",
    currency: "pt.currency",
    package: "pt.package_code_snapshot",
  },
  sponsors: {
    columns: [
      col("reference", "Application Reference"),
      col("organization", "Organization"),
      col("contact", "Contact Person"),
      col("email", "Email"),
      col("package", "Selected Package"),
      col("usdValue", "Authoritative USD Value"),
      col("status", "Status"),
      col("applicationDate", "Application Date"),
    ],
    select: `sa.reference AS "reference",sa.organization_name AS "organization",
      concat_ws(' ',sa.contact_first_name,sa.contact_last_name) AS "contact",sa.contact_email AS "email",
      sa.package_name_snapshot AS "package",'USD ' || ${money("sa.price_minor_snapshot")} AS "usdValue",
      sa.status AS "status",${utc("sa.created_at")} AS "applicationDate"`,
    from: "sponsor_applications sa",
    date: "sa.created_at",
    reference: "sa.reference",
    status: "sa.status",
    package: "sa.package_code_snapshot",
  },
  exhibitors: {
    columns: [
      col("reference", "Application Reference"),
      col("organization", "Organization"),
      col("contact", "Contact Person"),
      col("email", "Email"),
      col("package", "Selected Exhibition Package"),
      col("usdValue", "Authoritative USD Value"),
      col("status", "Status"),
      col("applicationDate", "Application Date"),
    ],
    select: `ea.reference AS "reference",ea.organization_name AS "organization",
      concat_ws(' ',ea.contact_first_name,ea.contact_last_name) AS "contact",ea.contact_email AS "email",
      ea.package_name_snapshot AS "package",'USD ' || ${money("ea.price_minor_snapshot")} AS "usdValue",
      ea.status AS "status",${utc("ea.created_at")} AS "applicationDate"`,
    from: "exhibitor_applications ea",
    date: "ea.created_at",
    reference: "ea.reference",
    status: "ea.status",
    package: "ea.package_code_snapshot",
  },
  abstracts: {
    columns: [
      col("reference", "Submission Reference"),
      col("author", "Author"),
      col("email", "Email"),
      col("title", "Title"),
      col("status", "Status"),
      col("submissionDate", "Submission Date"),
      col("reviewDate", "Review Date"),
    ],
    select: `a.reference AS "reference",concat_ws(' ',a.author_first_name,a.author_last_name) AS "author",
      a.author_email AS "email",a.title AS "title",a.status AS "status",
      ${utc("a.submitted_at")} AS "submissionDate",
      CASE WHEN a.decided_at IS NULL THEN NULL ELSE ${utc("a.decided_at")} END AS "reviewDate"`,
    from: "abstract_submissions a",
    date: "a.submitted_at",
    reference: "a.reference",
    status: "a.status",
  },
  enquiries: {
    columns: [
      col("reference", "Enquiry Reference"),
      col("sender", "Sender"),
      col("email", "Email"),
      col("category", "Category"),
      col("subject", "Subject"),
      col("status", "Status"),
      col("submittedDate", "Submitted Date"),
      col("resolvedDate", "Resolved Date"),
    ],
    select: `e.reference AS "reference",concat_ws(' ',e.first_name,e.last_name) AS "sender",
      e.email AS "email",e.category AS "category",e.subject AS "subject",e.status AS "status",
      ${utc("e.created_at")} AS "submittedDate",
      CASE WHEN e.resolved_at IS NULL THEN NULL ELSE ${utc("e.resolved_at")} END AS "resolvedDate"`,
    from: "enquiries e",
    date: "e.created_at",
    reference: "e.reference",
    status: "e.status",
    category: "e.category",
  },
};

function buildWhere(definition: Definition, filters: ReportFilters) {
  const clauses: string[] = definition.base ? [definition.base] : [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown, operator = "=") => {
    values.push(value);
    clauses.push(`${column} ${operator} $${values.length}`);
  };
  if (filters.dateFrom)
    add(definition.date, new Date(`${filters.dateFrom}T00:00:00+01:00`), ">=");
  if (filters.dateTo) {
    const end = new Date(`${filters.dateTo}T00:00:00+01:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    add(definition.date, end, "<");
  }
  if (filters.status) add(definition.status, filters.status);
  if (filters.paymentStatus && definition.paymentStatus)
    add(definition.paymentStatus, filters.paymentStatus);
  if (filters.currency && definition.currency)
    add(definition.currency, filters.currency);
  if (filters.package && definition.package)
    add(definition.package, filters.package);
  if (filters.category && definition.category)
    add(definition.category, filters.category);
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function mapRows(
  rows: QueryResultRow[],
  columns: readonly ReportColumn[],
): ReportRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => [
        column.key,
        row[column.key] === null || row[column.key] === undefined
          ? null
          : String(row[column.key]),
      ]),
    ),
  );
}

export interface ReportRepository {
  columns(domain: ReportDomain): readonly ReportColumn[];
  count(domain: ReportDomain, filters: ReportFilters): Promise<number>;
  rows(
    domain: ReportDomain,
    filters: ReportFilters,
    offset: number,
    limit: number,
  ): Promise<ReportRow[]>;
  summary(now: Date): Promise<ReportSummary>;
  auditExport(
    adminId: string,
    domain: ReportDomain,
    filters: ReportFilters,
    now: Date,
  ): Promise<void>;
}

export function createReportRepository(
  executor?: DatabaseExecutor,
): ReportRepository {
  const db = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };
  return {
    columns(domain) {
      return definitions[domain].columns;
    },
    async count(domain, filters) {
      const definition = definitions[domain];
      const { where, values } = buildWhere(definition, filters);
      const result = await db().query<{ total: string }>(
        `SELECT count(*)::text AS total FROM ${definition.from} ${where}`,
        values,
      );
      return Number(result.rows[0]?.total ?? 0);
    },
    async rows(domain, filters, offset, limit) {
      const definition = definitions[domain];
      const { where, values } = buildWhere(definition, filters);
      values.push(limit, offset);
      const result = await db().query<QueryResultRow>(
        `SELECT ${definition.select} FROM ${definition.from} ${where}
         ORDER BY ${definition.date} DESC,${definition.reference} DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return mapRows(result.rows, definition.columns);
    },
    async summary(now) {
      const result = await db().query<QueryResultRow>(`
        SELECT
          (SELECT count(*)::text FROM delegate_registrations WHERE package_type_snapshot='PROFESSIONAL') AS professional_registrations,
          (SELECT count(*)::text FROM delegate_registrations WHERE package_type_snapshot='PROFESSIONAL' AND payment_status='PAID') AS paid_professional,
          (SELECT count(*)::text FROM delegate_registrations WHERE package_type_snapshot='PROFESSIONAL' AND payment_status='PENDING') AS pending_professional,
          (SELECT COALESCE(sum(pt.amount_minor),0)::text FROM delegate_registrations dr JOIN payment_transactions pt ON pt.id=dr.authoritative_payment_transaction_id WHERE pt.status='PAID' AND pt.currency='NGN') AS ngn_revenue_minor,
          (SELECT COALESCE(sum(pt.amount_minor),0)::text FROM delegate_registrations dr JOIN payment_transactions pt ON pt.id=dr.authoritative_payment_transaction_id WHERE pt.status='PAID' AND pt.currency='USD') AS usd_revenue_minor,
          (SELECT count(*)::text FROM sponsor_applications) AS sponsors,
          (SELECT count(*)::text FROM sponsor_applications WHERE status='CONFIRMED') AS confirmed_sponsors,
          (SELECT count(*)::text FROM exhibitor_applications) AS exhibitors,
          (SELECT count(*)::text FROM exhibitor_applications WHERE status='CONFIRMED') AS confirmed_exhibitors,
          (SELECT count(*)::text FROM abstract_submissions) AS abstracts,
          (SELECT count(*)::text FROM abstract_submissions WHERE status='ACCEPTED') AS accepted_abstracts,
          (SELECT count(*)::text FROM enquiries WHERE status IN ('OPEN','IN_PROGRESS')) AS open_enquiries
      `);
      const row = result.rows[0];
      if (!row) throw new Error("Report summary unavailable");
      const studentResult = await db().query<{ status: string; total: string }>(
        "SELECT status,count(*)::text AS total FROM student_verifications GROUP BY status",
      );
      return {
        professionalRegistrations: Number(row.professional_registrations),
        paidProfessionalRegistrations: Number(row.paid_professional),
        pendingProfessionalRegistrations: Number(row.pending_professional),
        studentsByStatus: {
          ...Object.fromEntries(
            studentVerificationStatuses.map((status) => [status, 0]),
          ),
          ...Object.fromEntries(
            studentResult.rows.map((item) => [item.status, Number(item.total)]),
          ),
        },
        confirmedRevenueMinor: {
          NGN: Number(row.ngn_revenue_minor),
          USD: Number(row.usd_revenue_minor),
        },
        sponsorApplications: Number(row.sponsors),
        confirmedSponsors: Number(row.confirmed_sponsors),
        exhibitorApplications: Number(row.exhibitors),
        confirmedExhibitors: Number(row.confirmed_exhibitors),
        abstractSubmissions: Number(row.abstracts),
        acceptedAbstracts: Number(row.accepted_abstracts),
        openEnquiries: Number(row.open_enquiries),
        generatedAt: now,
      };
    },
    async auditExport(adminId, domain, filters, now) {
      const { page: _page, limit: _limit, ...auditedFilters } = filters;
      await db().query(
        `INSERT INTO report_export_audit (id,admin_id,report_type,format,filters,generated_at)
         VALUES ($1,$2,$3,'CSV',$4::jsonb,$5)`,
        [
          randomUUID(),
          adminId,
          domain.toUpperCase(),
          JSON.stringify(auditedFilters),
          now,
        ],
      );
    },
  };
}

export const postgresReportRepository = createReportRepository();
