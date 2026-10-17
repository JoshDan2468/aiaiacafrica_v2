/**
 * Admin invitation repository
 *
 * Owns parameterized invitation SQL. It receives token hashes only; raw
 * invitation tokens must never cross this data-access boundary.
 */

import type { QueryResultRow } from "pg";
import { getDatabasePool } from "../config/database";
import type {
  AdminInvitation,
  AdminInvitationRecord,
  AdminInvitationStatus,
  InvitableAdminRole,
} from "../types/admin";
import type { DatabaseExecutor } from "../types/database";

interface AdminInvitationRow extends QueryResultRow {
  id: string;
  email: string;
  full_name: string;
  role: InvitableAdminRole;
  token_hash: string;
  invited_by_admin_id: string;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  email_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAdminInvitationInput {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: InvitableAdminRole;
  readonly tokenHash: string;
  readonly invitedByAdminId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface AdminInvitationRepository {
  lockEmail(email: string, executor: DatabaseExecutor): Promise<void>;
  findPendingByEmail(
    email: string,
    now: Date,
    executor: DatabaseExecutor,
  ): Promise<AdminInvitationRecord | null>;
  create(
    input: CreateAdminInvitationInput,
    executor?: DatabaseExecutor,
  ): Promise<AdminInvitationRecord>;
  list(): Promise<AdminInvitation[]>;
  findById(
    id: string,
    executor?: DatabaseExecutor,
    forUpdate?: boolean,
  ): Promise<AdminInvitationRecord | null>;
  findByTokenHash(
    tokenHash: string,
    executor?: DatabaseExecutor,
    forUpdate?: boolean,
  ): Promise<AdminInvitationRecord | null>;
  markEmailSent(id: string, sentAt: Date): Promise<void>;
  rotateToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
    updatedAt: Date,
    executor: DatabaseExecutor,
  ): Promise<AdminInvitationRecord>;
  revoke(
    id: string,
    revokedAt: Date,
    executor: DatabaseExecutor,
  ): Promise<AdminInvitationRecord>;
  markAccepted(
    id: string,
    acceptedAt: Date,
    executor: DatabaseExecutor,
  ): Promise<void>;
}

function invitationStatus(
  row: AdminInvitationRow,
  now = new Date(),
): AdminInvitationStatus {
  if (row.accepted_at) return "ACCEPTED";
  if (row.revoked_at) return "REVOKED";
  if (row.expires_at.getTime() <= now.getTime()) return "EXPIRED";
  return "PENDING";
}

function mapInvitation(row: AdminInvitationRow): AdminInvitationRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    tokenHash: row.token_hash,
    invitedByAdminId: row.invited_by_admin_id,
    status: invitationStatus(row),
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSafeInvitation(record: AdminInvitationRecord): AdminInvitation {
  const { tokenHash: _tokenHash, ...safe } = record;
  return safe;
}

function database(executor?: DatabaseExecutor): DatabaseExecutor {
  const pool = executor ?? getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

const selection = `
  SELECT id, email, full_name, role, token_hash, invited_by_admin_id,
         expires_at, accepted_at, revoked_at, email_sent_at, created_at, updated_at
  FROM admin_invitations
`;

export const postgresAdminInvitationRepository: AdminInvitationRepository = {
  async lockEmail(email, executor) {
    // Transaction-scoped advisory locking prevents concurrent duplicate pending invitations.
    await executor.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
  },

  async findPendingByEmail(email, now, executor) {
    const result = await executor.query<AdminInvitationRow>(
      `${selection}
       WHERE email = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2
       ORDER BY created_at DESC LIMIT 1`,
      [email, now],
    );
    const row = result.rows[0];
    return row ? mapInvitation(row) : null;
  },

  async create(input, executor) {
    const result = await database(executor).query<AdminInvitationRow>(
      `INSERT INTO admin_invitations (
         id, email, full_name, role, token_hash, invited_by_admin_id,
         expires_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING id, email, full_name, role, token_hash, invited_by_admin_id,
                 expires_at, accepted_at, revoked_at, email_sent_at, created_at, updated_at`,
      [
        input.id,
        input.email,
        input.fullName,
        input.role,
        input.tokenHash,
        input.invitedByAdminId,
        input.expiresAt,
        input.createdAt,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invitation creation returned no record");
    return mapInvitation(row);
  },

  async list() {
    const result = await database().query<AdminInvitationRow>(
      `${selection} ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => toSafeInvitation(mapInvitation(row)));
  },

  async findById(id, executor, forUpdate = false) {
    const result = await database(executor).query<AdminInvitationRow>(
      `${selection} WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapInvitation(row) : null;
  },

  async findByTokenHash(tokenHash, executor, forUpdate = false) {
    const result = await database(executor).query<AdminInvitationRow>(
      `${selection} WHERE token_hash = $1${forUpdate ? " FOR UPDATE" : ""}`,
      [tokenHash],
    );
    const row = result.rows[0];
    return row ? mapInvitation(row) : null;
  },

  async markEmailSent(id, sentAt) {
    await database().query(
      `UPDATE admin_invitations
       SET email_sent_at = $2, updated_at = $2
       WHERE id = $1`,
      [id, sentAt],
    );
  },

  async rotateToken(id, tokenHash, expiresAt, updatedAt, executor) {
    const result = await executor.query<AdminInvitationRow>(
      `UPDATE admin_invitations
       SET token_hash = $2, expires_at = $3, email_sent_at = NULL, updated_at = $4
       WHERE id = $1
       RETURNING id, email, full_name, role, token_hash, invited_by_admin_id,
                 expires_at, accepted_at, revoked_at, email_sent_at, created_at, updated_at`,
      [id, tokenHash, expiresAt, updatedAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invitation token rotation returned no record");
    return mapInvitation(row);
  },

  async revoke(id, revokedAt, executor) {
    const result = await executor.query<AdminInvitationRow>(
      `UPDATE admin_invitations
       SET revoked_at = $2, updated_at = $2
       WHERE id = $1
       RETURNING id, email, full_name, role, token_hash, invited_by_admin_id,
                 expires_at, accepted_at, revoked_at, email_sent_at, created_at, updated_at`,
      [id, revokedAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invitation revocation returned no record");
    return mapInvitation(row);
  },

  async markAccepted(id, acceptedAt, executor) {
    const result = await executor.query(
      `UPDATE admin_invitations
       SET accepted_at = $2, updated_at = $2
       WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [id, acceptedAt],
    );
    if (result.rowCount !== 1)
      throw new Error("Invitation acceptance state changed");
  },
};
