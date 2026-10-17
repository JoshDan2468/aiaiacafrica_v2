import { getDatabasePool } from "../config/database";

export interface DelegateRegistrationAcknowledgementClaim {
  email: string;
  fullName: string;
  registrationReference: string;
}

export interface DelegateRegistrationAcknowledgementRepository {
  claim(
    registrationId: string,
  ): Promise<DelegateRegistrationAcknowledgementClaim | null>;
  recordResult(registrationId: string, sent: boolean): Promise<void>;
}

function database() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

export const postgresDelegateRegistrationAcknowledgementRepository: DelegateRegistrationAcknowledgementRepository =
  {
    async claim(registrationId) {
      const result = await database().query<{
        email: string;
        full_name: string;
        reference: string;
      }>(
        `UPDATE delegate_registration_acknowledgements ack
       SET status='PENDING',attempts=attempts+1,
           last_attempt_at=current_timestamp,updated_at=current_timestamp
       FROM delegate_registrations dr
       WHERE ack.registration_id=$1 AND dr.id=ack.registration_id
         AND ack.status IN ('NOT_QUEUED','FAILED') AND ack.attempts<3
       RETURNING dr.email,concat_ws(' ',dr.first_name,dr.last_name) AS full_name,dr.reference`,
        [registrationId],
      );
      const row = result.rows[0];
      return row
        ? {
            email: row.email,
            fullName: row.full_name,
            registrationReference: row.reference,
          }
        : null;
    },

    async recordResult(registrationId, sent) {
      await database().query(
        `UPDATE delegate_registration_acknowledgements
       SET status=$2::varchar,
           sent_at=CASE WHEN $2::varchar='SENT' THEN current_timestamp ELSE NULL END,
           updated_at=current_timestamp
       WHERE registration_id=$1 AND status='PENDING'`,
        [registrationId, sent ? "SENT" : "FAILED"],
      );
    },
  };
