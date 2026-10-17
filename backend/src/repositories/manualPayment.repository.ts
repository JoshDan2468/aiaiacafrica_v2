import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type { PaymentCurrency, PaymentMethod } from "../types/payment";
import type { AdminAuditRepository } from "./adminAudit.repository";
import { postgresAdminAuditRepository } from "./adminAudit.repository";
import { isRegistrationEligibleForPayment } from "./payment.repository";

export interface ManualPaymentEligibility {
  readonly registrationReference: string;
  readonly delegateName: string;
  readonly delegateEmail: string;
  readonly packageCode: string;
  readonly packageName: string;
  readonly currency: PaymentCurrency;
  readonly amountMinor: number | null;
  readonly eligible: boolean;
  readonly reason:
    | null
    | "EMAIL_UNVERIFIED"
    | "REGISTRATION_INELIGIBLE"
    | "STUDENT_NOT_APPROVED"
    | "ALREADY_PAID"
    | "PRICE_UNAVAILABLE";
}

export interface RecordManualPaymentInput {
  readonly registrationReference: string;
  readonly method: Extract<PaymentMethod, "BANK_TRANSFER" | "OFFLINE">;
  readonly currency: PaymentCurrency;
  readonly amountMinor: number;
  readonly externalReference: string;
  readonly paymentDate: Date;
  readonly payerName?: string | undefined;
  readonly internalNote?: string | undefined;
  readonly adminId: string;
  readonly paymentReference: string;
}

export type ManualPaymentRecordResult =
  | { kind: "recorded"; paymentReference: string }
  | { kind: "not_found" }
  | {
      kind: "ineligible";
      reason: NonNullable<ManualPaymentEligibility["reason"]>;
    }
  | { kind: "amount_mismatch"; expectedAmountMinor: number }
  | { kind: "duplicate_pending" }
  | { kind: "duplicate_external_reference" };

export type ManualPaymentConfirmationResult =
  | { kind: "confirmed"; paymentReference: string }
  | { kind: "already_confirmed"; paymentReference: string }
  | { kind: "not_found" }
  | { kind: "not_pending" }
  | { kind: "ineligible"; reason: string }
  | { kind: "already_paid" };

export interface ManualPaymentRepository {
  inspectEligibility(
    registrationReference: string,
    currency: PaymentCurrency,
  ): Promise<ManualPaymentEligibility | null>;
  record(input: RecordManualPaymentInput): Promise<ManualPaymentRecordResult>;
  confirm(
    paymentReference: string,
    adminId: string,
  ): Promise<ManualPaymentConfirmationResult>;
}

interface RegistrationRow extends QueryResultRow {
  id: string;
  reference: string;
  delegate_name: string;
  email: string;
  registration_status: string;
  payment_status: string;
  authoritative_payment_transaction_id: string | null;
  package_code: string;
  package_name: string;
  package_type: string;
  student_verification_status: string | null;
  email_verification_status: string;
  amount_minor: number | null;
}

interface ManualPaymentRow extends RegistrationRow {
  payment_id: string;
  provider_reference: string;
  status: string;
  financial_authority: string;
  currency: PaymentCurrency;
  payment_amount_minor: number;
  payment_method: Extract<PaymentMethod, "BANK_TRANSFER" | "OFFLINE">;
}

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

const registrationSelect = `
  SELECT dr.id, dr.reference,
         concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
         dr.email, dr.registration_status, dr.payment_status,
         dr.authoritative_payment_transaction_id,
         dp.delegate_type AS package_code, dp.name AS package_name,
         dp.delegate_type AS package_type,
         sv.status AS student_verification_status,
         dr.email_verification_status, dpp.amount_minor
  FROM delegate_registrations dr
  JOIN delegate_packages dp ON dp.id = dr.package_id
  LEFT JOIN student_verifications sv ON sv.registration_id = dr.id
  LEFT JOIN delegate_package_prices dpp
    ON dpp.package_id = dr.package_id AND dpp.currency = $2 AND dpp.is_active = true
  WHERE dr.reference = $1`;

function ineligibilityReason(
  registration: RegistrationRow,
): NonNullable<ManualPaymentEligibility["reason"]> | null {
  if (
    registration.authoritative_payment_transaction_id ||
    registration.payment_status === "PAID"
  )
    return "ALREADY_PAID";
  if (registration.email_verification_status !== "VERIFIED")
    return "EMAIL_UNVERIFIED";
  if (
    registration.package_type === "STUDENT" &&
    registration.student_verification_status !== "APPROVED"
  )
    return "STUDENT_NOT_APPROVED";
  if (
    !isRegistrationEligibleForPayment({
      packageType: registration.package_type,
      registrationStatus: registration.registration_status,
      studentVerificationStatus: registration.student_verification_status,
      emailVerificationStatus: registration.email_verification_status,
    })
  )
    return "REGISTRATION_INELIGIBLE";
  if (registration.amount_minor === null) return "PRICE_UNAVAILABLE";
  return null;
}

async function recordManualEvent(
  client: PoolClient,
  paymentId: string,
  eventType:
    | "MANUAL_PAYMENT_RECORDED"
    | "MANUAL_PAYMENT_CONFIRMED"
    | "MANUAL_PAYMENT_CONFIRMATION_FAILED",
  details: Record<string, unknown> = {},
) {
  await client.query(
    `INSERT INTO payment_events (id, payment_transaction_id, event_type, details)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (payment_transaction_id, event_type) DO NOTHING`,
    [randomUUID(), paymentId, eventType, JSON.stringify(details)],
  );
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === constraint
  );
}

export function createManualPaymentRepository(
  audits: AdminAuditRepository = postgresAdminAuditRepository,
): ManualPaymentRepository {
  return {
    async inspectEligibility(registrationReference, currency) {
      const result = await requireDatabasePool().query<RegistrationRow>(
        registrationSelect,
        [registrationReference, currency],
      );
      const registration = result.rows[0];
      if (!registration) return null;
      const reason = ineligibilityReason(registration);
      return {
        registrationReference: registration.reference,
        delegateName: registration.delegate_name,
        delegateEmail: registration.email,
        packageCode: registration.package_code,
        packageName: registration.package_name,
        currency,
        amountMinor: registration.amount_minor,
        eligible: reason === null,
        reason,
      };
    },

    async record(input) {
      try {
        return await withTransaction(async (client) => {
          const result = await client.query<RegistrationRow>(
            `${registrationSelect} FOR UPDATE OF dr`,
            [input.registrationReference, input.currency],
          );
          const registration = result.rows[0];
          if (!registration) return { kind: "not_found" } as const;
          const reason = ineligibilityReason(registration);
          if (reason) return { kind: "ineligible", reason } as const;
          if (registration.amount_minor !== input.amountMinor) {
            return {
              kind: "amount_mismatch",
              expectedAmountMinor: registration.amount_minor!,
            } as const;
          }
          const paymentId = randomUUID();
          await client.query(
            `INSERT INTO payment_transactions (
               id, registration_id, provider, payment_source, payment_method,
               provider_reference, package_code_snapshot, customer_email_snapshot,
               currency, amount_minor, status, external_reference, payer_name,
               internal_note, payment_date, recorded_by_admin_id
             ) VALUES (
               $1, $2, 'MANUAL', 'MANUAL', $3, $4, $5, $6, $7, $8,
               'PENDING_CONFIRMATION', $9, $10, $11, $12, $13
             )`,
            [
              paymentId,
              registration.id,
              input.method,
              input.paymentReference,
              registration.package_code,
              registration.email,
              input.currency,
              registration.amount_minor,
              input.externalReference.trim(),
              input.payerName?.trim() || null,
              input.internalNote?.trim() || null,
              input.paymentDate,
              input.adminId,
            ],
          );
          await recordManualEvent(
            client,
            paymentId,
            "MANUAL_PAYMENT_RECORDED",
            {
              source: "MANUAL",
              method: input.method,
              actorAdminId: input.adminId,
            },
          );
          await audits.create(
            {
              adminId: input.adminId,
              action: "MANUAL_PAYMENT_RECORDED",
              entityType: "PAYMENT_TRANSACTION",
              entityId: paymentId,
              metadata: {
                paymentReference: input.paymentReference,
                registrationReference: registration.reference,
                method: input.method,
              },
            },
            client,
          );
          return {
            kind: "recorded",
            paymentReference: input.paymentReference,
          } as const;
        });
      } catch (error) {
        if (
          isUniqueViolation(
            error,
            "IDX_payment_transactions_one_pending_manual_registration",
          )
        )
          return { kind: "duplicate_pending" };
        if (
          isUniqueViolation(
            error,
            "IDX_payment_transactions_manual_external_reference",
          )
        )
          return { kind: "duplicate_external_reference" };
        throw error;
      }
    },

    async confirm(paymentReference, adminId) {
      return withTransaction(async (client) => {
        const result = await client.query<ManualPaymentRow>(
          `SELECT pt.id AS payment_id, pt.provider_reference, pt.status,
                  pt.financial_authority, pt.currency,
                  pt.amount_minor AS payment_amount_minor, pt.payment_method,
                  dr.id, dr.reference,
                  concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
                  dr.email, dr.registration_status, dr.payment_status,
                  dr.authoritative_payment_transaction_id,
                  dp.delegate_type AS package_code, dp.name AS package_name,
                  dp.delegate_type AS package_type,
                  sv.status AS student_verification_status,
                  dr.email_verification_status, dpp.amount_minor
           FROM payment_transactions pt
           JOIN delegate_registrations dr ON dr.id = pt.registration_id
           JOIN delegate_packages dp ON dp.id = dr.package_id
           LEFT JOIN student_verifications sv ON sv.registration_id = dr.id
           LEFT JOIN delegate_package_prices dpp
             ON dpp.package_id = dr.package_id
            AND dpp.currency = pt.currency AND dpp.is_active = true
           WHERE pt.provider_reference = $1 AND pt.payment_source = 'MANUAL'
           FOR UPDATE OF pt, dr`,
          [paymentReference],
        );
        const payment = result.rows[0];
        if (!payment) return { kind: "not_found" } as const;
        if (
          payment.status === "PAID" &&
          payment.financial_authority === "AUTHORITATIVE" &&
          payment.authoritative_payment_transaction_id === payment.payment_id
        ) {
          return { kind: "already_confirmed", paymentReference } as const;
        }
        if (payment.status !== "PENDING_CONFIRMATION") {
          return { kind: "not_pending" } as const;
        }

        const fail = async (reason: string) => {
          await recordManualEvent(
            client,
            payment.payment_id,
            "MANUAL_PAYMENT_CONFIRMATION_FAILED",
            { reason, actorAdminId: adminId },
          );
          await audits.create(
            {
              adminId,
              action: "MANUAL_PAYMENT_CONFIRMATION_FAILED",
              entityType: "PAYMENT_TRANSACTION",
              entityId: payment.payment_id,
              metadata: {
                paymentReference,
                registrationReference: payment.reference,
                reason,
              },
            },
            client,
          );
        };

        if (
          payment.authoritative_payment_transaction_id &&
          payment.authoritative_payment_transaction_id !== payment.payment_id
        ) {
          await fail("REGISTRATION_ALREADY_PAID");
          return { kind: "already_paid" } as const;
        }
        const reason = ineligibilityReason(payment);
        if (reason && reason !== "ALREADY_PAID") {
          await fail(reason);
          return { kind: "ineligible", reason } as const;
        }
        if (
          payment.amount_minor === null ||
          payment.amount_minor !== payment.payment_amount_minor
        ) {
          await fail("AUTHORITATIVE_PRICE_CHANGED");
          return {
            kind: "ineligible",
            reason: "AUTHORITATIVE_PRICE_CHANGED",
          } as const;
        }

        await client.query(
          `UPDATE payment_transactions
           SET status = 'PAID', provider_status = 'manual_confirmed',
               financial_authority = 'AUTHORITATIVE',
               channel = payment_method, paid_at = payment_date,
               verified_at = current_timestamp,
               confirmation_email_status = 'PENDING',
               confirmed_by_admin_id = $2, confirmed_at = current_timestamp,
               failure_reason = NULL, reconciliation_reason = NULL,
               updated_at = current_timestamp
           WHERE id = $1`,
          [payment.payment_id, adminId],
        );
        const registrationUpdate = await client.query(
          `UPDATE delegate_registrations
           SET payment_status = 'PAID', authoritative_payment_transaction_id = $2,
               updated_at = current_timestamp
           WHERE id = $1 AND authoritative_payment_transaction_id IS NULL`,
          [payment.id, payment.payment_id],
        );
        if (!registrationUpdate.rowCount) {
          await fail("REGISTRATION_ALREADY_PAID");
          return { kind: "already_paid" } as const;
        }
        await recordManualEvent(
          client,
          payment.payment_id,
          "MANUAL_PAYMENT_CONFIRMED",
          { actorAdminId: adminId },
        );
        await client.query(
          `INSERT INTO payment_events (id, payment_transaction_id, event_type, details)
           VALUES ($1, $2, 'PAYMENT_CONFIRMED', $3::jsonb)
           ON CONFLICT (payment_transaction_id, event_type) DO NOTHING`,
          [
            randomUUID(),
            payment.payment_id,
            JSON.stringify({ source: "MANUAL", actorAdminId: adminId }),
          ],
        );
        await audits.create(
          {
            adminId,
            action: "MANUAL_PAYMENT_CONFIRMED",
            entityType: "PAYMENT_TRANSACTION",
            entityId: payment.payment_id,
            metadata: {
              paymentReference,
              registrationReference: payment.reference,
              method: payment.payment_method,
            },
          },
          client,
        );
        return { kind: "confirmed", paymentReference } as const;
      });
    },
  };
}

export const postgresManualPaymentRepository = createManualPaymentRepository();
