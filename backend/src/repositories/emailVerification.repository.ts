import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type {
  EmailVerificationIssueResult,
  EmailVerificationRequestKind,
  EmailVerificationResult,
} from "../types/emailVerification";

interface RegistrationRow extends QueryResultRow {
  id: string;
  reference: string;
  email: string;
  full_name: string;
  delegate_type: "PROFESSIONAL" | "STUDENT";
  email_verification_status: "UNVERIFIED" | "VERIFIED";
}

interface TokenRow extends RegistrationRow {
  expires_at: Date;
  consumed_at: Date | null;
  available_prices: Array<{ currency: "USD" | "NGN"; amountMinor: number }>;
}

export interface EmailVerificationRepository {
  issue(
    registrationReference: string,
    email: string | null,
    tokenHash: string,
    expiresAt: Date,
    requestKind: EmailVerificationRequestKind,
    now: Date,
  ): Promise<EmailVerificationIssueResult>;
  recordDelivery(registrationId: string, sent: boolean, now: Date): Promise<void>;
  verify(tokenHash: string, now: Date): Promise<EmailVerificationResult>;
}

async function recordEvent(
  client: PoolClient,
  registrationId: string | null,
  eventType:
    | "EMAIL_VERIFICATION_REQUESTED"
    | "EMAIL_VERIFICATION_RESENT"
    | "EMAIL_VERIFICATION_SENT"
    | "EMAIL_VERIFICATION_DELIVERY_FAILED"
    | "EMAIL_VERIFICATION_COMPLETED"
    | "EMAIL_VERIFICATION_INVALID_ATTEMPT"
    | "EMAIL_VERIFICATION_EXPIRED_ATTEMPT",
  details: Readonly<Record<string, string>> = {},
): Promise<void> {
  await client.query(
    `INSERT INTO delegate_email_verification_events (
       id, registration_id, event_type, details
     ) VALUES ($1, $2, $3, $4::jsonb)`,
    [randomUUID(), registrationId, eventType, JSON.stringify(details)],
  );
}

export const postgresEmailVerificationRepository: EmailVerificationRepository = {
  async issue(registrationReference, email, tokenHash, expiresAt, requestKind, now) {
    return withTransaction(async (client) => {
      const result = await client.query<RegistrationRow>(
        `SELECT dr.id, dr.reference, dr.email,
                concat_ws(' ', dr.first_name, dr.last_name) AS full_name,
                dr.package_type_snapshot AS delegate_type,
                dr.email_verification_status
         FROM delegate_registrations dr
         WHERE dr.reference = $1
           AND ($2::text IS NULL OR dr.email = $2)
         FOR UPDATE OF dr`,
        [registrationReference, email],
      );
      const registration = result.rows[0];
      if (!registration) return { kind: "NOT_FOUND" } as const;
      if (registration.email_verification_status === "VERIFIED") {
        return { kind: "ALREADY_VERIFIED" } as const;
      }

      await client.query(
        `INSERT INTO delegate_email_verifications (
           registration_id, token_hash, expires_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (registration_id) DO UPDATE
         SET token_hash = EXCLUDED.token_hash,
             expires_at = EXCLUDED.expires_at,
             consumed_at = NULL,
             email_sent_at = NULL,
             request_count = delegate_email_verifications.request_count + 1,
             updated_at = EXCLUDED.updated_at`,
        [registration.id, tokenHash, expiresAt, now],
      );
      await recordEvent(
        client,
        registration.id,
        requestKind === "INITIAL"
          ? "EMAIL_VERIFICATION_REQUESTED"
          : "EMAIL_VERIFICATION_RESENT",
      );
      return {
        kind: "ISSUED",
        recipient: {
          registrationId: registration.id,
          registrationReference: registration.reference,
          email: registration.email,
          fullName: registration.full_name,
          delegateType: registration.delegate_type,
          expiresAt,
        },
      } as const;
    });
  },

  async recordDelivery(registrationId, sent, now) {
    await withTransaction(async (client) => {
      if (sent) {
        await client.query(
          `UPDATE delegate_email_verifications
           SET email_sent_at = $2, updated_at = $2
           WHERE registration_id = $1`,
          [registrationId, now],
        );
      }
      await recordEvent(
        client,
        registrationId,
        sent
          ? "EMAIL_VERIFICATION_SENT"
          : "EMAIL_VERIFICATION_DELIVERY_FAILED",
      );
    });
  },

  async verify(tokenHash, now) {
    return withTransaction(async (client) => {
      const result = await client.query<TokenRow>(
        `SELECT dr.id, dr.reference, dr.email,
                concat_ws(' ', dr.first_name, dr.last_name) AS full_name,
                dr.package_type_snapshot AS delegate_type,
                dr.email_verification_status,
                dev.expires_at, dev.consumed_at,
                COALESCE(pricing.available_prices, '[]'::jsonb) AS available_prices
         FROM delegate_email_verifications dev
         JOIN delegate_registrations dr ON dr.id = dev.registration_id
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(
             jsonb_build_object('currency', currency, 'amountMinor', amount_minor)
             ORDER BY CASE currency WHEN 'USD' THEN 0 ELSE 1 END
           ) AS available_prices
           FROM delegate_package_prices
           WHERE package_id = dr.package_id AND is_active = true
         ) pricing ON true
         WHERE dev.token_hash = $1
         FOR UPDATE OF dev, dr`,
        [tokenHash],
      );
      const token = result.rows[0];
      if (!token) {
        await recordEvent(
          client,
          null,
          "EMAIL_VERIFICATION_INVALID_ATTEMPT",
          { reason: "NOT_FOUND" },
        );
        return { kind: "INVALID" } as const;
      }
      if (
        token.consumed_at ||
        token.email_verification_status === "VERIFIED"
      ) {
        await recordEvent(
          client,
          token.id,
          "EMAIL_VERIFICATION_INVALID_ATTEMPT",
          { reason: "USED" },
        );
        return { kind: "USED" } as const;
      }
      if (token.expires_at.getTime() <= now.getTime()) {
        await recordEvent(
          client,
          token.id,
          "EMAIL_VERIFICATION_EXPIRED_ATTEMPT",
        );
        return { kind: "EXPIRED" } as const;
      }

      await client.query(
        `UPDATE delegate_registrations
         SET email_verification_status = 'VERIFIED',
             email_verified_at = $2,
             updated_at = $2
         WHERE id = $1 AND email_verification_status = 'UNVERIFIED'`,
        [token.id, now],
      );
      await client.query(
        `UPDATE delegate_email_verifications
         SET consumed_at = $2, updated_at = $2
         WHERE registration_id = $1`,
        [token.id, now],
      );
      await recordEvent(
        client,
        token.id,
        "EMAIL_VERIFICATION_COMPLETED",
      );
      return {
        kind: "VERIFIED",
        registrationReference: token.reference,
        delegateType: token.delegate_type,
        availablePrices: token.available_prices,
      } as const;
    });
  },
};
