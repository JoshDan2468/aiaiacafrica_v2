/**
 * Admin audit repository
 *
 * Persists small, non-sensitive records for staff security actions. Callers
 * choose metadata deliberately and may supply a transaction client.
 */

import { randomUUID } from "node:crypto";
import { getDatabasePool } from "../config/database";
import type { AuditAction } from "../types/admin";
import type { DatabaseExecutor } from "../types/database";

export interface CreateAuditLogInput {
  readonly adminId: string;
  readonly action: AuditAction;
  readonly entityType:
    | "ADMIN_USER"
    | "ADMIN_INVITATION"
    | "COMMUNICATION_CAMPAIGN"
    | "COMMUNICATION_CONTACT"
    | "COMMERCIAL_APPLICATION"
    | "EVENT_PASS"
    | "PAYMENT_TRANSACTION"
    | "EVENT_ACCREDITATION";
  readonly entityId: string;
  readonly metadata?: Readonly<Record<string, string | boolean | null>>;
  readonly createdAt?: Date;
}

export interface AdminAuditRepository {
  create(
    input: CreateAuditLogInput,
    executor?: DatabaseExecutor,
  ): Promise<void>;
}

function database(executor?: DatabaseExecutor): DatabaseExecutor {
  const pool = executor ?? getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

export const postgresAdminAuditRepository: AdminAuditRepository = {
  async create(input, executor) {
    await database(executor).query(
      `INSERT INTO admin_audit_logs (
         id, admin_id, action, entity_type, entity_id, metadata, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        randomUUID(),
        input.adminId,
        input.action,
        input.entityType,
        input.entityId,
        JSON.stringify(input.metadata ?? {}),
        input.createdAt ?? new Date(),
      ],
    );
  },
};
