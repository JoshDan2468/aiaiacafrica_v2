import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type { DatabaseExecutor } from "../types/database";
import type {
  CheckInAttendee,
  CheckInMethod,
  CheckInResult,
  RecentCheckIn,
} from "../types/checkIn";
import {
  postgresAdminAuditRepository,
  type AdminAuditRepository,
} from "./adminAudit.repository";

export interface CheckInCandidate extends CheckInAttendee {
  readonly registrationId: string;
  readonly eventPassId: string | null;
  readonly registrationStatus: string;
  readonly authoritativePaymentStatus: string | null;
  readonly financialAuthority: string | null;
  readonly checkedInAt: Date | null;
}

export type CheckInSelector =
  | { readonly credentialHash: string }
  | { readonly registrationReference: string };

export interface CheckInRepository {
  findByCredentialHash(hash: string): Promise<CheckInCandidate | null>;
  lookup(query: string, limit: number): Promise<CheckInCandidate[]>;
  confirm(
    selector: CheckInSelector,
    method: CheckInMethod,
    adminId: string,
    now: Date,
  ): Promise<CheckInResult>;
  recent(limit: number): Promise<RecentCheckIn[]>;
  count(now: Date): Promise<{ today: number; total: number }>;
}

interface CandidateRow extends QueryResultRow {
  registration_id: string;
  registration_reference: string;
  name: string;
  category: "PROFESSIONAL" | "STUDENT";
  registration_status: string;
  email_verification_status: "UNVERIFIED" | "VERIFIED";
  payment_status: string;
  event_pass_id: string | null;
  event_pass_status: "ACTIVE" | "REVOKED" | null;
  student_verification_status: string | null;
  authoritative_payment_status: string | null;
  financial_authority: string | null;
  checked_in_at: Date | null;
}

const candidateSelect = `SELECT dr.id AS registration_id,
  dr.reference AS registration_reference,
  concat_ws(' ', dr.first_name, dr.last_name) AS name,
  dr.package_type_snapshot AS category, dr.registration_status,
  dr.email_verification_status, dr.payment_status,
  ep.id AS event_pass_id, ep.status AS event_pass_status,
  sv.status AS student_verification_status,
  pt.status AS authoritative_payment_status, pt.financial_authority,
  COALESCE(ci.checked_in_at, ep.checked_in_at) AS checked_in_at
  FROM delegate_registrations dr
  LEFT JOIN delegate_event_passes ep ON ep.registration_id = dr.id
  LEFT JOIN student_verifications sv ON sv.registration_id = dr.id
  LEFT JOIN payment_transactions pt
    ON pt.id = dr.authoritative_payment_transaction_id AND pt.registration_id = dr.id
  LEFT JOIN delegate_check_ins ci ON ci.event_pass_id = ep.id`;

function database(): DatabaseExecutor {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

function mapCandidate(row: CandidateRow): CheckInCandidate {
  return {
    registrationId: row.registration_id,
    eventPassId: row.event_pass_id,
    name: row.name,
    registrationReference: row.registration_reference,
    category: row.category,
    registrationStatus: row.registration_status,
    emailVerificationStatus: row.email_verification_status,
    paymentStatus: row.payment_status,
    eventPassStatus: row.event_pass_status ?? "NOT_ISSUED",
    studentVerificationStatus: row.student_verification_status,
    authoritativePaymentStatus: row.authoritative_payment_status,
    financialAuthority: row.financial_authority,
    checkedInAt: row.checked_in_at,
  };
}

export function evaluateCheckIn(
  candidate: CheckInCandidate | null,
): CheckInResult {
  if (!candidate)
    return { status: "INVALID_PASS", attendee: null, checkedInAt: null };
  const attendee: CheckInAttendee = {
    name: candidate.name,
    registrationReference: candidate.registrationReference,
    category: candidate.category,
    emailVerificationStatus: candidate.emailVerificationStatus,
    paymentStatus: candidate.paymentStatus,
    eventPassStatus: candidate.eventPassStatus,
    studentVerificationStatus: candidate.studentVerificationStatus,
  };
  const result = (status: CheckInResult["status"]): CheckInResult => ({
    status,
    attendee,
    checkedInAt: candidate.checkedInAt,
  });
  // A recorded admission remains visible even if eligibility changes afterward.
  if (candidate.checkedInAt) return result("ALREADY_CHECKED_IN");
  if (candidate.eventPassStatus === "REVOKED") return result("INACTIVE_PASS");
  if (
    ["REJECTED", "CANCELLED"].includes(candidate.registrationStatus) ||
    candidate.emailVerificationStatus !== "VERIFIED" ||
    (candidate.category === "STUDENT" &&
      candidate.studentVerificationStatus !== "APPROVED")
  )
    return result("REGISTRATION_NOT_ELIGIBLE");
  // Reversals/refunds need a human financial decision; this does not revoke the pass.
  if (
    ["RECONCILIATION_REQUIRED", "REVERSED"].includes(
      candidate.authoritativePaymentStatus ?? "",
    ) ||
    candidate.paymentStatus === "REFUNDED"
  )
    return result("RECONCILIATION_REQUIRED");
  if (
    candidate.paymentStatus !== "PAID" ||
    candidate.authoritativePaymentStatus !== "PAID" ||
    candidate.financialAuthority !== "AUTHORITATIVE" ||
    candidate.eventPassStatus !== "ACTIVE" ||
    !candidate.eventPassId
  )
    return result("REGISTRATION_NOT_ELIGIBLE");
  return result("VALID_ACTIVE_PASS");
}

export function createPostgresCheckInRepository(
  audits: AdminAuditRepository = postgresAdminAuditRepository,
): CheckInRepository {
  return {
    async findByCredentialHash(hash) {
      const result = await database().query<CandidateRow>(
        `${candidateSelect} WHERE ep.credential_hash = $1`,
        [hash],
      );
      return result.rows[0] ? mapCandidate(result.rows[0]) : null;
    },
    async lookup(query, limit) {
      const result = await database().query<CandidateRow>(
        `${candidateSelect} WHERE dr.reference = $1 OR dr.email = $2
         ORDER BY dr.created_at DESC, dr.id LIMIT $3`,
        [query.trim().toUpperCase(), query.trim().toLowerCase(), limit],
      );
      return result.rows.map(mapCandidate);
    },
    async confirm(selector, method, adminId, now) {
      return withTransaction(async (client) => {
        const condition =
          "credentialHash" in selector
            ? "ep.credential_hash = $1"
            : "dr.reference = $1";
        const value =
          "credentialHash" in selector
            ? selector.credentialHash
            : selector.registrationReference;
        const initial = await client.query<CandidateRow>(
          `${candidateSelect} WHERE ${condition}`,
          [value],
        );
        const initialRow = initial.rows[0];
        if (initialRow) {
          // Match existing financial writers: payment, registration, then Event Pass.
          await client.query(
            `SELECT pt.id FROM payment_transactions pt
             JOIN delegate_registrations dr ON dr.authoritative_payment_transaction_id = pt.id
             WHERE dr.id = $1 FOR UPDATE OF pt`,
            [initialRow.registration_id],
          );
          await client.query(
            "SELECT id FROM delegate_registrations WHERE id = $1 FOR UPDATE",
            [initialRow.registration_id],
          );
          await client.query(
            "SELECT id FROM delegate_event_passes WHERE registration_id = $1 FOR UPDATE",
            [initialRow.registration_id],
          );
          await client.query(
            "SELECT id FROM student_verifications WHERE registration_id = $1 FOR UPDATE",
            [initialRow.registration_id],
          );
        }
        // Re-read after lock acquisition so another staff device sees the first admission.
        const loaded = await client.query<CandidateRow>(
          `${candidateSelect} WHERE ${condition}`,
          [value],
        );
        const candidate = loaded.rows[0] ? mapCandidate(loaded.rows[0]) : null;
        let result = evaluateCheckIn(candidate);
        if (result.status === "VALID_ACTIVE_PASS" && candidate?.eventPassId) {
          const inserted = await client.query<{ checked_in_at: Date }>(
            `INSERT INTO delegate_check_ins
              (id, event_pass_id, registration_id, checked_in_at, checked_in_by_admin_id, method)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (event_pass_id) DO NOTHING RETURNING checked_in_at`,
            [
              randomUUID(),
              candidate.eventPassId,
              candidate.registrationId,
              now,
              adminId,
              method,
            ],
          );
          if (inserted.rows[0]) {
            await client.query(
              `UPDATE delegate_event_passes SET checked_in_at = $2, updated_at = $2
               WHERE id = $1`,
              [candidate.eventPassId, now],
            );
            result = {
              ...result,
              status: "CHECKED_IN",
              checkedInAt: inserted.rows[0].checked_in_at,
            };
          } else {
            const prior = await client.query<{ checked_in_at: Date }>(
              "SELECT checked_in_at FROM delegate_check_ins WHERE event_pass_id = $1",
              [candidate.eventPassId],
            );
            result = {
              ...result,
              status: "ALREADY_CHECKED_IN",
              checkedInAt: prior.rows[0]!.checked_in_at,
            };
          }
        }
        await audits.create(
          {
            adminId,
            action:
              result.status === "CHECKED_IN"
                ? "CHECK_IN_CONFIRMED"
                : result.status === "ALREADY_CHECKED_IN"
                  ? "CHECK_IN_ALREADY_COMPLETED"
                  : "CHECK_IN_DENIED",
            entityType: candidate?.eventPassId ? "EVENT_PASS" : "ADMIN_USER",
            entityId: candidate?.eventPassId ?? adminId,
            metadata: {
              status: result.status,
              method,
              registrationReference: candidate?.registrationReference ?? null,
            },
            createdAt: now,
          },
          client,
        );
        return result;
      });
    },
    async recent(limit) {
      const result = await database().query<RecentCheckIn>(
        `SELECT concat_ws(' ', dr.first_name, dr.last_name) AS name,
           dr.reference AS "registrationReference", dr.package_type_snapshot AS category,
           ci.checked_in_at AS "checkedInAt", ci.method,
           a.full_name AS "staffName"
         FROM delegate_check_ins ci
         JOIN delegate_registrations dr ON dr.id = ci.registration_id
         JOIN admins a ON a.id = ci.checked_in_by_admin_id
         ORDER BY ci.checked_in_at DESC, ci.id DESC LIMIT $1`,
        [limit],
      );
      return result.rows;
    },
    async count(now) {
      const result = await database().query<{ today: string; total: string }>(
        `SELECT count(*)::text AS total,
           count(*) FILTER (WHERE checked_in_at >=
             (date_trunc('day', $1::timestamptz AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
             AND checked_in_at <
             ((date_trunc('day', $1::timestamptz AT TIME ZONE 'Africa/Lagos') + interval '1 day')
               AT TIME ZONE 'Africa/Lagos'))::text AS today
         FROM delegate_check_ins`,
        [now],
      );
      return {
        today: Number(result.rows[0]!.today),
        total: Number(result.rows[0]!.total),
      };
    },
  };
}

export const postgresCheckInRepository = createPostgresCheckInRepository();
