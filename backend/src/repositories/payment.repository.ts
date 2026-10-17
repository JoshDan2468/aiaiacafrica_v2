/**
 * Payment repository
 *
 * Owns trusted price resolution, active-attempt serialization, payment state
 * transitions, and the deliberately small payment event history.
 */

import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type {
  OnlinePaymentProvider,
  PaymentCurrency,
  PaymentDetail,
  PaymentListFilters,
  PaymentListResult,
  PaymentRecord,
  PaymentTransactionStatus,
} from "../types/payment";

export type PaymentPreparation =
  | { kind: "not_found" }
  | { kind: "ineligible" }
  | { kind: "already_paid" }
  | { kind: "price_unavailable" }
  | { kind: "retry_blocked" }
  | { kind: "initializing"; paymentReference: string }
  | { kind: "existing"; payment: PaymentRecord }
  | {
      kind: "created";
      payment: PaymentRecord;
      email: string;
      registrationReference: string;
      packageCode: string;
    };

export interface SuccessfulPaymentInput {
  paymentReference: string;
  providerReference: string;
  providerTransactionId: string;
  amountMinor: number;
  chargedAmountMinor: number;
  currency: string;
  customerEmail: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: Date | null;
}

export type PaymentFinalization =
  | { kind: "not_found" }
  | {
      kind: "mismatch";
      reason: "reference" | "amount" | "currency" | "customer";
    }
  | { kind: "paid"; payment: PaymentRecord; becamePaid: boolean }
  | { kind: "duplicate_success"; payment: PaymentRecord };

export interface PaymentReconciliationCandidate {
  paymentReference: string;
}

export interface PaymentRepository {
  prepareInitialization(
    registrationReference: string,
    currency: PaymentCurrency,
    paymentReference: string,
    replaceActive?: boolean,
    provider?: OnlinePaymentProvider,
  ): Promise<PaymentPreparation>;
  completeInitialization(
    paymentReference: string,
    authorizationUrl: string,
    accessCode: string | null,
  ): Promise<PaymentRecord | null>;
  failInitialization(paymentReference: string): Promise<void>;
  findByReference(paymentReference: string): Promise<PaymentRecord | null>;
  recordVerificationFailure(
    paymentReference: string,
    reason: string,
  ): Promise<void>;
  recordProviderObservation(
    paymentReference: string,
    providerStatus: string,
  ): Promise<void>;
  recordRefundState(
    paymentReference: string,
    providerStatus: string,
  ): Promise<PaymentRecord | null>;
  claimReconciliationCandidates(
    limit: number,
    now: Date,
    initiatedBy: string,
    providers?: readonly OnlinePaymentProvider[],
  ): Promise<PaymentReconciliationCandidate[]>;
  finalizeSuccessfulPayment(
    input: SuccessfulPaymentInput,
  ): Promise<PaymentFinalization>;
  listPayments(filters: PaymentListFilters): Promise<PaymentListResult>;
  findPaymentDetail(paymentReference: string): Promise<PaymentDetail | null>;
}

interface PaymentRow extends QueryResultRow {
  id: string;
  registration_id: string;
  registration_reference: string;
  delegate_name: string;
  delegate_email: string;
  provider: PaymentRecord["provider"];
  payment_source: PaymentRecord["paymentSource"];
  payment_method: PaymentRecord["paymentMethod"];
  provider_reference: string;
  provider_transaction_id: string | null;
  package_code_snapshot: string;
  package_name: string;
  currency: PaymentCurrency;
  amount_minor: number;
  status: PaymentTransactionStatus;
  provider_status: string | null;
  financial_authority: PaymentRecord["financialAuthority"];
  reconciliation_reason: string | null;
  reconciliation_attempts: number;
  reconciliation_last_attempt_at: Date | null;
  failure_reason: string | null;
  authoritative_payment_transaction_id: string | null;
  authorization_url: string | null;
  access_code: string | null;
  channel: string | null;
  gateway_response: string | null;
  external_reference: string | null;
  payer_name: string | null;
  internal_note: string | null;
  payment_date: Date | null;
  recorded_by_admin_id: string | null;
  recorded_by_name: string | null;
  confirmed_by_admin_id: string | null;
  confirmed_by_name: string | null;
  confirmed_at: Date | null;
  confirmation_email_status: PaymentRecord["confirmationEmailStatus"];
  created_at: Date;
  paid_at: Date | null;
  verified_at: Date | null;
}

interface RegistrationRow extends QueryResultRow {
  id: string;
  reference: string;
  email: string;
  registration_status: string;
  payment_status: string;
  package_code: string;
  package_name: string;
  package_type: string;
  student_verification_status: string | null;
  email_verification_status: string;
}

export function isRegistrationEligibleForPayment(input: {
  packageType: string;
  registrationStatus: string;
  studentVerificationStatus: string | null;
  emailVerificationStatus: string;
}): boolean {
  if (input.emailVerificationStatus !== "VERIFIED") return false;
  if (["REJECTED", "CANCELLED"].includes(input.registrationStatus))
    return false;
  if (input.packageType === "PROFESSIONAL") return true;
  return (
    input.packageType === "STUDENT" &&
    input.studentVerificationStatus === "APPROVED"
  );
}

const paymentSelect = `
  SELECT pt.id, pt.registration_id, dr.reference AS registration_reference,
         concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
         pt.customer_email_snapshot AS delegate_email, pt.provider, pt.payment_source, pt.payment_method,
         pt.provider_reference,
         pt.provider_transaction_id, pt.package_code_snapshot,
         dr.package_name_snapshot AS package_name, pt.currency, pt.amount_minor,
         pt.status, pt.authorization_url, pt.access_code, pt.channel,
         pt.gateway_response, pt.external_reference, pt.payer_name, pt.internal_note,
         pt.payment_date, pt.recorded_by_admin_id, recorder.full_name AS recorded_by_name,
         pt.confirmed_by_admin_id, confirmer.full_name AS confirmed_by_name, pt.confirmed_at,
         pt.provider_status, pt.financial_authority,
         pt.reconciliation_reason, pt.reconciliation_attempts,
         pt.reconciliation_last_attempt_at, pt.failure_reason,
         dr.authoritative_payment_transaction_id,
         pt.confirmation_email_status, pt.created_at,
         pt.paid_at, pt.verified_at
  FROM payment_transactions pt
  JOIN delegate_registrations dr ON dr.id = pt.registration_id
  LEFT JOIN admins recorder ON recorder.id = pt.recorded_by_admin_id
  LEFT JOIN admins confirmer ON confirmer.id = pt.confirmed_by_admin_id`;

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    registrationId: row.registration_id,
    registrationReference: row.registration_reference,
    delegateName: row.delegate_name,
    delegateEmail: row.delegate_email,
    provider: row.provider,
    paymentSource: row.payment_source,
    paymentMethod: row.payment_method,
    paymentReference: row.provider_reference,
    providerTransactionId: row.provider_transaction_id,
    packageCode: row.package_code_snapshot,
    packageName: row.package_name,
    currency: row.currency,
    amountMinor: row.amount_minor,
    status: row.status,
    providerStatus: row.provider_status,
    financialAuthority: row.financial_authority,
    reconciliationReason: row.reconciliation_reason,
    reconciliationAttempts: row.reconciliation_attempts,
    reconciliationLastAttemptAt: row.reconciliation_last_attempt_at,
    failureReason: row.failure_reason,
    authoritativePaymentTransactionId: row.authoritative_payment_transaction_id,
    authorizationUrl: row.authorization_url,
    accessCode: row.access_code,
    channel: row.channel,
    gatewayResponse: row.gateway_response,
    externalReference: row.external_reference,
    payerName: row.payer_name,
    internalNote: row.internal_note,
    paymentDate: row.payment_date,
    recordedByAdminId: row.recorded_by_admin_id,
    recordedByName: row.recorded_by_name,
    confirmedByAdminId: row.confirmed_by_admin_id,
    confirmedByName: row.confirmed_by_name,
    confirmedAt: row.confirmed_at,
    confirmationEmailStatus: row.confirmation_email_status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    verifiedAt: row.verified_at,
  };
}

async function findPayment(
  executor: Pick<PoolClient, "query">,
  paymentReference: string,
  forUpdate = false,
): Promise<PaymentRecord | null> {
  const result = await executor.query<PaymentRow>(
    `${paymentSelect} WHERE pt.provider_reference = $1${forUpdate ? " FOR UPDATE OF pt, dr" : ""}`,
    [paymentReference],
  );
  return result.rows[0] ? mapPayment(result.rows[0]) : null;
}

async function recordEvent(
  client: PoolClient,
  paymentId: string,
  eventType:
    | "PAYMENT_INITIALIZED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_VERIFICATION_FAILED"
    | "PAYMENT_DUPLICATE_SUCCESS"
    | "PAYMENT_RECONCILIATION_ATTEMPTED"
    | "PAYMENT_RECONCILIATION_REQUIRED"
    | "PAYMENT_RECONCILIATION_RESOLVED",
  details: Record<string, unknown> = {},
): Promise<void> {
  await client.query(
    `INSERT INTO payment_events (id, payment_transaction_id, event_type, details)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (payment_transaction_id, event_type) DO NOTHING`,
    [randomUUID(), paymentId, eventType, JSON.stringify(details)],
  );
}

export const postgresPaymentRepository: PaymentRepository = {
  async prepareInitialization(
    registrationReference,
    currency,
    paymentReference,
    replaceActive = false,
    provider = "PAYSTACK",
  ) {
    return withTransaction(async (client) => {
      const registrationResult = await client.query<RegistrationRow>(
        `SELECT dr.id, dr.reference, dr.email, dr.registration_status, dr.payment_status,
                dp.delegate_type AS package_code, dp.name AS package_name,
                dp.delegate_type AS package_type,
                sv.status AS student_verification_status,
                dr.email_verification_status
         FROM delegate_registrations dr
         JOIN delegate_packages dp ON dp.id = dr.package_id
         LEFT JOIN student_verifications sv ON sv.registration_id = dr.id
         WHERE dr.reference = $1
         FOR UPDATE OF dr`,
        [registrationReference],
      );
      const registration = registrationResult.rows[0];
      if (!registration) return { kind: "not_found" } as const;
      if (
        !isRegistrationEligibleForPayment({
          packageType: registration.package_type,
          registrationStatus: registration.registration_status,
          studentVerificationStatus: registration.student_verification_status,
          emailVerificationStatus: registration.email_verification_status,
        })
      ) {
        return { kind: "ineligible" } as const;
      }
      if (registration.payment_status === "PAID")
        return { kind: "already_paid" } as const;

      if (replaceActive) {
        const latestAttempt = await client.query<{
          status: PaymentTransactionStatus;
        }>(
          `SELECT status FROM payment_transactions
           WHERE registration_id=$1
           ORDER BY created_at DESC,id DESC LIMIT 1`,
          [registration.id],
        );
        const latestStatus = latestAttempt.rows[0]?.status;
        if (latestStatus && !["FAILED", "ABANDONED"].includes(latestStatus)) {
          return { kind: "retry_blocked" } as const;
        }
      }

      const priceResult = await client.query<{ amount_minor: number }>(
        `SELECT amount_minor
         FROM delegate_package_prices
         WHERE package_id = (SELECT package_id FROM delegate_registrations WHERE id = $1)
           AND currency = $2 AND is_active = true
         FOR SHARE`,
        [registration.id, currency],
      );
      const price = priceResult.rows[0];
      if (!price) return { kind: "price_unavailable" } as const;

      const activeResult = await client.query<PaymentRow>(
        `${paymentSelect}
         WHERE pt.registration_id = $1 AND pt.status IN ('INITIALIZED', 'PENDING')
         LIMIT 1`,
        [registration.id],
      );
      const active = activeResult.rows[0]
        ? mapPayment(activeResult.rows[0])
        : null;
      if (active) {
        if (replaceActive) {
          return { kind: "retry_blocked" } as const;
        } else {
          // No elapsed-time expiry: a paused process or lost provider response may still create a payable link.
          if (active.provider !== provider || active.currency !== currency)
            return { kind: "retry_blocked" } as const;
          return active.authorizationUrl
            ? ({ kind: "existing", payment: active } as const)
            : ({
                kind: "initializing",
                paymentReference: active.paymentReference,
              } as const);
        }
      }

      const paymentId = randomUUID();
      await client.query(
        `INSERT INTO payment_transactions (
           id, registration_id, provider, provider_reference, package_code_snapshot,
           customer_email_snapshot, currency, amount_minor, status, payment_source, payment_method
         ) VALUES ($1, $2, $8, $3, $4, $5, $6, $7, 'INITIALIZED', $8, $8)`,
        [
          paymentId,
          registration.id,
          paymentReference,
          registration.package_code,
          registration.email,
          currency,
          price.amount_minor,
          provider,
        ],
      );
      await recordEvent(client, paymentId, "PAYMENT_INITIALIZED");
      await client.query(
        `UPDATE delegate_registrations
         SET payment_status='PENDING',updated_at=current_timestamp
         WHERE id=$1 AND authoritative_payment_transaction_id IS NULL`,
        [registration.id],
      );
      const payment = await findPayment(client, paymentReference);
      if (!payment) throw new Error("Payment creation returned no record");
      return {
        kind: "created",
        payment,
        email: registration.email,
        registrationReference: registration.reference,
        packageCode: registration.package_code,
      } as const;
    });
  },

  async completeInitialization(paymentReference, authorizationUrl, accessCode) {
    await requireDatabasePool().query(
      `UPDATE payment_transactions
       SET authorization_url = $2, access_code = $3, status = 'PENDING', updated_at = current_timestamp
       WHERE provider_reference = $1 AND status = 'INITIALIZED'`,
      [paymentReference, authorizationUrl, accessCode],
    );
    return findPayment(requireDatabasePool(), paymentReference);
  },

  async failInitialization(paymentReference) {
    await requireDatabasePool().query(
      `UPDATE payment_transactions
       SET status = 'FAILED', failure_reason = 'PROVIDER_INITIALIZATION_FAILED',
           updated_at = current_timestamp
       WHERE provider_reference = $1 AND status = 'INITIALIZED'`,
      [paymentReference],
    );
  },

  findByReference(paymentReference) {
    return findPayment(requireDatabasePool(), paymentReference);
  },

  async recordVerificationFailure(paymentReference, reason) {
    await withTransaction(async (client) => {
      const payment = await findPayment(client, paymentReference, true);
      if (
        !payment ||
        payment.financialAuthority !== "UNRESOLVED" ||
        ["PAID", "DUPLICATE_SUCCESS", "RECONCILIATION_REQUIRED"].includes(
          payment.status,
        )
      )
        return;
      const providerStatus = reason.startsWith("PROVIDER_")
        ? reason.slice("PROVIDER_".length).toLowerCase()
        : null;
      await client.query(
        `UPDATE payment_transactions
         SET status = CASE
               WHEN $2 = 'PROVIDER_ABANDONED' THEN 'ABANDONED'
               WHEN $2 = 'PROVIDER_REVERSED' THEN 'REVERSED'
               ELSE 'FAILED'
             END,
             failure_reason = $2, provider_status = $3,
             verified_at = current_timestamp,
             updated_at = current_timestamp
         WHERE provider_reference = $1`,
        [paymentReference, reason.slice(0, 80), providerStatus],
      );
      await client.query(
        `UPDATE delegate_registrations dr
         SET payment_status='FAILED',updated_at=current_timestamp
         WHERE dr.id=$1 AND dr.authoritative_payment_transaction_id IS NULL
           AND $2::uuid = (
             SELECT latest.id FROM payment_transactions latest
             WHERE latest.registration_id=dr.id
             ORDER BY latest.created_at DESC,latest.id DESC LIMIT 1
           )`,
        [payment.registrationId, payment.id],
      );
      await recordEvent(client, payment.id, "PAYMENT_VERIFICATION_FAILED");
    });
  },

  async recordProviderObservation(paymentReference, providerStatus) {
    await requireDatabasePool().query(
      `UPDATE payment_transactions
       SET provider_status = $2, verified_at = current_timestamp,
           updated_at = current_timestamp
       WHERE provider_reference = $1
         AND financial_authority = 'UNRESOLVED'`,
      [paymentReference, providerStatus.slice(0, 32)],
    );
  },

  async recordRefundState(paymentReference, providerStatus) {
    return withTransaction(async (client) => {
      const payment = await findPayment(client, paymentReference, true);
      if (!payment || payment.financialAuthority === "UNRESOLVED")
        return payment;
      const normalized = providerStatus.toLowerCase();
      if (normalized === "failed") {
        await client.query(
          `UPDATE payment_transactions
           SET status = CASE
                 WHEN financial_authority = 'AUTHORITATIVE' THEN 'PAID'
                 ELSE 'DUPLICATE_SUCCESS'
               END,
               provider_status = 'success', reconciliation_reason = CASE
                 WHEN financial_authority = 'NON_AUTHORITATIVE'
                   THEN 'DUPLICATE_SUCCESS_REQUIRES_RECONCILIATION'
                 ELSE NULL
               END,
               updated_at = current_timestamp
           WHERE id = $1`,
          [payment.id],
        );
        await recordEvent(
          client,
          payment.id,
          "PAYMENT_RECONCILIATION_RESOLVED",
        );
      } else {
        const terminal =
          normalized === "processed" || normalized === "reversed";
        await client.query(
          `UPDATE payment_transactions
           SET status = $2, provider_status = $3, reconciliation_reason = $4,
               updated_at = current_timestamp
           WHERE id = $1`,
          [
            payment.id,
            terminal ? "REVERSED" : "RECONCILIATION_REQUIRED",
            terminal ? "reversed" : `refund.${normalized}`,
            terminal
              ? "PROVIDER_TRANSACTION_REVERSED"
              : `REFUND_${normalized.replaceAll("-", "_").toUpperCase()}`,
          ],
        );
        await recordEvent(
          client,
          payment.id,
          "PAYMENT_RECONCILIATION_REQUIRED",
        );
      }
      return findPayment(client, paymentReference);
    });
  },

  async claimReconciliationCandidates(
    limit,
    now,
    initiatedBy,
    providers = ["PAYSTACK", "FLUTTERWAVE"],
  ) {
    return withTransaction(async (client) => {
      const candidates = await client.query<{
        id: string;
        provider_reference: string;
      }>(
        `SELECT id, provider_reference
         FROM payment_transactions
         WHERE financial_authority = 'UNRESOLVED'
           AND provider = ANY($3::varchar[])
           AND status IN ('INITIALIZED', 'PENDING', 'FAILED', 'ABANDONED')
           AND created_at <= $2::timestamptz - interval '2 minutes'
           AND reconciliation_attempts < 3
           AND (reconciliation_last_attempt_at IS NULL OR
                reconciliation_last_attempt_at <= $2::timestamptz - interval '15 minutes')
           AND COALESCE(failure_reason, '') NOT LIKE 'MISMATCH_%'
         ORDER BY created_at ASC, id ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit, now, providers],
      );
      for (const candidate of candidates.rows) {
        await client.query(
          `UPDATE payment_transactions
           SET reconciliation_attempts = reconciliation_attempts + 1,
               reconciliation_last_attempt_at = $2, updated_at = $2
           WHERE id = $1`,
          [candidate.id, now],
        );
        await recordEvent(
          client,
          candidate.id,
          "PAYMENT_RECONCILIATION_ATTEMPTED",
          { initiatedBy },
        );
      }
      return candidates.rows.map((candidate) => ({
        paymentReference: candidate.provider_reference,
      }));
    });
  },

  async finalizeSuccessfulPayment(input) {
    return withTransaction(async (client) => {
      const payment = await findPayment(client, input.paymentReference, true);
      if (!payment) return { kind: "not_found" } as const;
      const mismatch =
        input.providerReference !== payment.paymentReference
          ? "reference"
          : input.amountMinor !== payment.amountMinor ||
              input.chargedAmountMinor < input.amountMinor
            ? "amount"
            : input.currency !== payment.currency
              ? "currency"
              : input.customerEmail?.trim().toLowerCase() !==
                  payment.delegateEmail
                ? "customer"
                : null;
      if (mismatch) {
        if (payment.status !== "PAID" && payment.provider !== "FLUTTERWAVE") {
          await client.query(
            `UPDATE payment_transactions
             SET status = 'FAILED', failure_reason = $2, verified_at = current_timestamp,
                 updated_at = current_timestamp
             WHERE provider_reference = $1`,
            [input.paymentReference, `MISMATCH_${mismatch.toUpperCase()}`],
          );
          await recordEvent(client, payment.id, "PAYMENT_VERIFICATION_FAILED");
        }
        return { kind: "mismatch", reason: mismatch } as const;
      }
      if (
        payment.financialAuthority === "AUTHORITATIVE" &&
        payment.status === "PAID"
      )
        return { kind: "paid", payment, becamePaid: false } as const;

      if (
        payment.financialAuthority === "NON_AUTHORITATIVE" &&
        payment.status === "DUPLICATE_SUCCESS"
      )
        return { kind: "duplicate_success", payment } as const;

      if (
        payment.authoritativePaymentTransactionId &&
        payment.authoritativePaymentTransactionId !== payment.id
      ) {
        await client.query(
          `UPDATE payment_transactions
           SET status = 'DUPLICATE_SUCCESS', provider_status = 'success',
               financial_authority = 'NON_AUTHORITATIVE',
               provider_transaction_id = $2, channel = $3,
               gateway_response = $4, paid_at = COALESCE($5, current_timestamp),
               verified_at = current_timestamp,
               confirmation_email_status = 'NOT_QUEUED',
               failure_reason = NULL,
               reconciliation_reason = 'DUPLICATE_SUCCESS_REQUIRES_RECONCILIATION',
               updated_at = current_timestamp
           WHERE id = $1`,
          [
            payment.id,
            input.providerTransactionId,
            input.channel,
            input.gatewayResponse,
            input.paidAt,
          ],
        );
        await recordEvent(client, payment.id, "PAYMENT_DUPLICATE_SUCCESS");
        await recordEvent(
          client,
          payment.id,
          "PAYMENT_RECONCILIATION_REQUIRED",
        );
        const duplicate = await findPayment(client, input.paymentReference);
        if (!duplicate) throw new Error("Duplicate payment disappeared");
        return { kind: "duplicate_success", payment: duplicate } as const;
      }

      await client.query(
        `UPDATE payment_transactions
         SET status = 'PAID', provider_status = 'success',
             financial_authority = 'AUTHORITATIVE',
             provider_transaction_id = $2, channel = $3,
             gateway_response = $4, paid_at = COALESCE($5, current_timestamp),
             verified_at = current_timestamp, confirmation_email_status = 'PENDING',
             failure_reason = NULL, reconciliation_reason = NULL,
             updated_at = current_timestamp
         WHERE provider_reference = $1`,
        [
          input.paymentReference,
          input.providerTransactionId,
          input.channel,
          input.gatewayResponse,
          input.paidAt,
        ],
      );
      await client.query(
        `UPDATE delegate_registrations
         SET payment_status = 'PAID', authoritative_payment_transaction_id = $2,
             updated_at = current_timestamp
         WHERE id = $1 AND authoritative_payment_transaction_id IS NULL`,
        [payment.registrationId, payment.id],
      );
      await recordEvent(client, payment.id, "PAYMENT_CONFIRMED");
      if (
        payment.financialAuthority === "AUTHORITATIVE" &&
        ["RECONCILIATION_REQUIRED", "REVERSED"].includes(payment.status)
      ) {
        await recordEvent(
          client,
          payment.id,
          "PAYMENT_RECONCILIATION_RESOLVED",
        );
      }
      const updated = await findPayment(client, input.paymentReference);
      if (!updated) throw new Error("Finalized payment disappeared");
      return {
        kind: "paid",
        payment: updated,
        becamePaid: payment.financialAuthority !== "AUTHORITATIVE",
      } as const;
    });
  },

  async listPayments(filters) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      clauses.push(`${column} = $${values.length}`);
    };
    if (filters.status) add("pt.status", filters.status);
    if (filters.currency) add("pt.currency", filters.currency);
    if (filters.search) {
      values.push(`%${filters.search}%`);
      const parameter = `$${values.length}`;
      clauses.push(
        `(pt.provider_reference ILIKE ${parameter} OR dr.reference ILIKE ${parameter} OR ` +
          `dr.email ILIKE ${parameter} OR dr.first_name ILIKE ${parameter} OR dr.last_name ILIKE ${parameter})`,
      );
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const pool = requireDatabasePool();
    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM payment_transactions pt
       JOIN delegate_registrations dr ON dr.id = pt.registration_id ${where}`,
      values,
    );
    const pageValues = [
      ...values,
      filters.limit,
      (filters.page - 1) * filters.limit,
    ];
    const result = await pool.query<PaymentRow>(
      `${paymentSelect} ${where}
       ORDER BY pt.created_at DESC, pt.id DESC
       LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues,
    );
    return {
      items: result.rows.map(mapPayment),
      total: Number(count.rows[0]?.count ?? 0),
      page: filters.page,
      limit: filters.limit,
    };
  },

  async findPaymentDetail(paymentReference) {
    const pool = requireDatabasePool();
    const payment = await findPayment(pool, paymentReference);
    if (!payment) return null;
    const events = await pool.query<{
      event_type: PaymentDetail["events"][number]["eventType"];
      created_at: Date;
    }>(
      `SELECT event_type, created_at FROM payment_events
       WHERE payment_transaction_id = $1 ORDER BY created_at ASC, id ASC`,
      [payment.id],
    );
    return {
      ...payment,
      events: events.rows.map((event) => ({
        eventType: event.event_type,
        createdAt: event.created_at,
      })),
    };
  },
};
