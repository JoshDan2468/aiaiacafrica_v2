/** Admin overview aggregates authoritative counters in PostgreSQL. */

import type { QueryResultRow } from "pg";
import { getDatabasePool } from "../config/database";
import type { DatabaseExecutor } from "../types/database";
import type {
  AdminOverview,
  AdminRecentActivity,
} from "../types/adminOverview";

interface MetricsRow extends QueryResultRow {
  total_registrations: string;
  paid_registrations: string;
  pending_payments: string;
  ngn_revenue_minor: string;
  usd_revenue_minor: string;
  sponsor_applications: string;
  confirmed_sponsors: string;
  exhibitor_applications: string;
  confirmed_exhibitors: string;
  abstract_submissions: string;
  abstract_pending_review: string;
  accepted_abstracts: string;
  open_enquiries: string;
}

interface ActivityRow extends QueryResultRow {
  type: string;
  registration_reference: string | null;
  occurred_at: Date;
}

export interface AdminOverviewRepository {
  getOverview(): Promise<AdminOverview>;
}

function activitySummary(row: ActivityRow): string {
  const reference = row.registration_reference;
  switch (row.type) {
    case "PAYMENT_CONFIRMED":
      return reference
        ? `Payment confirmed for ${reference}`
        : "Payment confirmed";
    case "EVENT_PASS_ISSUED":
      return reference
        ? `Event pass issued for ${reference}`
        : "Event pass issued";
    case "DELEGATE_CONFIRMATION_SENT":
      return reference
        ? `Delegate confirmation sent for ${reference}`
        : "Delegate confirmation sent";
    case "ADMIN_PAYMENT_NOTIFICATION_SENT":
      return reference
        ? `Payment oversight notification sent for ${reference}`
        : "Payment oversight notification sent";
    case "INVITATION_ACCEPTED":
      return "Admin invitation accepted";
    case "USER_ROLE_CHANGED":
      return "Admin role changed";
    case "SPONSOR_APPLICATION_SUBMITTED":
      return reference
        ? `Sponsor application submitted: ${reference}`
        : "Sponsor application submitted";
    case "SPONSOR_APPLICATION_CONFIRMED":
      return reference
        ? `Sponsor application confirmed: ${reference}`
        : "Sponsor application confirmed";
    case "SPONSOR_MORE_INFORMATION_REQUIRED":
      return reference
        ? `Sponsor information requested: ${reference}`
        : "Sponsor information requested";
    case "SPONSOR_APPLICATION_DECLINED":
      return reference
        ? `Sponsor application declined: ${reference}`
        : "Sponsor application declined";
    case "EXHIBITOR_APPLICATION_SUBMITTED":
      return reference
        ? `Exhibitor application submitted: ${reference}`
        : "Exhibitor application submitted";
    case "EXHIBITOR_APPLICATION_CONFIRMED":
      return reference
        ? `Exhibitor application confirmed: ${reference}`
        : "Exhibitor application confirmed";
    case "EXHIBITOR_MORE_INFORMATION_REQUIRED":
      return reference
        ? `Exhibitor information requested: ${reference}`
        : "Exhibitor information requested";
    case "EXHIBITOR_APPLICATION_DECLINED":
      return reference
        ? `Exhibitor application declined: ${reference}`
        : "Exhibitor application declined";
    case "ABSTRACT_SUBMITTED":
      return reference
        ? `Abstract submitted: ${reference}`
        : "Abstract submitted";
    case "ABSTRACT_REVISION_REQUIRED":
      return reference
        ? `Abstract revision requested: ${reference}`
        : "Abstract revision requested";
    case "ABSTRACT_ACCEPTED":
      return reference
        ? `Abstract accepted: ${reference}`
        : "Abstract accepted";
    case "ABSTRACT_REJECTED":
      return reference
        ? `Abstract rejected: ${reference}`
        : "Abstract rejected";
    case "ENQUIRY_SUBMITTED":
      return reference
        ? `Enquiry submitted: ${reference}`
        : "Enquiry submitted";
    case "ENQUIRY_IN_PROGRESS":
      return reference
        ? `Enquiry in progress: ${reference}`
        : "Enquiry in progress";
    case "ENQUIRY_RESOLVED":
      return reference ? `Enquiry resolved: ${reference}` : "Enquiry resolved";
    case "ENQUIRY_CLOSED":
      return reference ? `Enquiry closed: ${reference}` : "Enquiry closed";
    default:
      return row.type.replaceAll("_", " ").toLowerCase();
  }
}

export function createAdminOverviewRepository(
  executor?: DatabaseExecutor,
): AdminOverviewRepository {
  const database = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };

  return {
    async getOverview() {
      const metricsResult = await database().query<MetricsRow>(`
        SELECT
          (SELECT count(*)::text FROM delegate_registrations) AS total_registrations,
          (SELECT count(*)::text FROM delegate_registrations
             WHERE payment_status = 'PAID') AS paid_registrations,
          (SELECT count(*)::text FROM delegate_registrations dr
             JOIN delegate_packages dp ON dp.id = dr.package_id
             LEFT JOIN student_verifications sv ON sv.registration_id = dr.id
             WHERE dr.payment_status = 'PENDING'
               AND dr.email_verification_status = 'VERIFIED'
               AND dr.registration_status NOT IN ('REJECTED', 'CANCELLED')
               AND (dp.delegate_type = 'PROFESSIONAL'
                 OR (dp.delegate_type = 'STUDENT' AND sv.status = 'APPROVED'))
               AND EXISTS (
                 SELECT 1 FROM delegate_package_prices dpp
                 WHERE dpp.package_id = dr.package_id AND dpp.is_active = true
               )) AS pending_payments,
          (SELECT COALESCE(sum(pt.amount_minor), 0)::text
             FROM delegate_registrations dr
             JOIN payment_transactions pt
               ON pt.id = dr.authoritative_payment_transaction_id
            WHERE pt.status = 'PAID' AND pt.currency = 'NGN') AS ngn_revenue_minor,
          (SELECT COALESCE(sum(pt.amount_minor), 0)::text
             FROM delegate_registrations dr
             JOIN payment_transactions pt
               ON pt.id = dr.authoritative_payment_transaction_id
            WHERE pt.status = 'PAID' AND pt.currency = 'USD') AS usd_revenue_minor,
          (SELECT count(*)::text FROM sponsor_applications) AS sponsor_applications,
          (SELECT count(*)::text FROM sponsor_applications
             WHERE status = 'CONFIRMED') AS confirmed_sponsors,
          (SELECT count(*)::text FROM exhibitor_applications) AS exhibitor_applications,
          (SELECT count(*)::text FROM exhibitor_applications
             WHERE status = 'CONFIRMED') AS confirmed_exhibitors,
          (SELECT count(*)::text FROM abstract_submissions) AS abstract_submissions,
          (SELECT count(*)::text FROM abstract_submissions
             WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')) AS abstract_pending_review,
          (SELECT count(*)::text FROM abstract_submissions
             WHERE status = 'ACCEPTED') AS accepted_abstracts,
          (SELECT count(*)::text FROM enquiries
             WHERE status IN ('OPEN', 'IN_PROGRESS')) AS open_enquiries
      `);
      const row = metricsResult.rows[0];
      if (!row) throw new Error("Overview metrics query returned no record");

      const activityResult = await database().query<ActivityRow>(`
        SELECT activity.type, activity.registration_reference, activity.occurred_at
        FROM (
          SELECT pe.event_type AS type, dr.reference AS registration_reference,
                 pe.created_at AS occurred_at
          FROM payment_events pe
          JOIN payment_transactions pt ON pt.id = pe.payment_transaction_id
          JOIN delegate_registrations dr ON dr.id = pt.registration_id
          WHERE pe.event_type IN (
            'PAYMENT_CONFIRMED', 'EVENT_PASS_ISSUED',
            'DELEGATE_CONFIRMATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_SENT'
          )
          UNION ALL
          SELECT aal.action AS type, NULL AS registration_reference,
                 aal.created_at AS occurred_at
          FROM admin_audit_logs aal
          WHERE aal.action IN ('INVITATION_ACCEPTED', 'USER_ROLE_CHANGED')
          UNION ALL
          SELECT
            CASE sah.action
              WHEN 'SUBMITTED' THEN 'SPONSOR_APPLICATION_SUBMITTED'
              WHEN 'CONFIRMED' THEN 'SPONSOR_APPLICATION_CONFIRMED'
              WHEN 'MORE_INFORMATION_REQUIRED' THEN 'SPONSOR_MORE_INFORMATION_REQUIRED'
              ELSE 'SPONSOR_APPLICATION_DECLINED'
            END AS type,
            sa.reference AS registration_reference,
            sah.created_at AS occurred_at
          FROM sponsor_application_history sah
          JOIN sponsor_applications sa ON sa.id = sah.application_id
          UNION ALL
          SELECT
            CASE eah.action
              WHEN 'SUBMITTED' THEN 'EXHIBITOR_APPLICATION_SUBMITTED'
              WHEN 'CONFIRMED' THEN 'EXHIBITOR_APPLICATION_CONFIRMED'
              WHEN 'MORE_INFORMATION_REQUIRED' THEN 'EXHIBITOR_MORE_INFORMATION_REQUIRED'
              ELSE 'EXHIBITOR_APPLICATION_DECLINED'
            END AS type,
            ea.reference AS registration_reference,
            eah.created_at AS occurred_at
          FROM exhibitor_application_history eah
          JOIN exhibitor_applications ea ON ea.id = eah.application_id
          UNION ALL
          SELECT ae.event_type AS type, abs.reference AS registration_reference,
                 ae.created_at AS occurred_at
          FROM abstract_events ae
          JOIN abstract_submissions abs ON abs.id = ae.abstract_submission_id
          WHERE ae.event_type IN ('ABSTRACT_SUBMITTED', 'ABSTRACT_REVISION_REQUIRED',
            'ABSTRACT_ACCEPTED', 'ABSTRACT_REJECTED')
          UNION ALL
          SELECT ee.event_type AS type, e.reference AS registration_reference,
                 ee.created_at AS occurred_at
          FROM enquiry_events ee
          JOIN enquiries e ON e.id = ee.enquiry_id
          WHERE ee.event_type IN ('ENQUIRY_SUBMITTED', 'ENQUIRY_IN_PROGRESS',
            'ENQUIRY_RESOLVED', 'ENQUIRY_CLOSED')
        ) activity
        ORDER BY activity.occurred_at DESC
        LIMIT 8
      `);

      const recentActivity: AdminRecentActivity[] = activityResult.rows.map(
        (activity) => ({
          type: activity.type,
          summary: activitySummary(activity),
          occurredAt: activity.occurred_at,
        }),
      );
      return {
        metrics: {
          totalRegistrations: Number(row.total_registrations),
          paidRegistrations: Number(row.paid_registrations),
          pendingPayments: Number(row.pending_payments),
          confirmedRevenue: {
            NGN: Number(row.ngn_revenue_minor),
            USD: Number(row.usd_revenue_minor),
          },
          sponsorApplications: Number(row.sponsor_applications ?? 0),
          confirmedSponsors: Number(row.confirmed_sponsors ?? 0),
          exhibitorApplications: Number(row.exhibitor_applications ?? 0),
          confirmedExhibitors: Number(row.confirmed_exhibitors ?? 0),
          abstractSubmissions: Number(row.abstract_submissions),
          abstractPendingReview: Number(row.abstract_pending_review),
          acceptedAbstracts: Number(row.accepted_abstracts),
          openEnquiries: Number(row.open_enquiries),
        },
        recentActivity,
      };
    },
  };
}

export const postgresAdminOverviewRepository = createAdminOverviewRepository();
