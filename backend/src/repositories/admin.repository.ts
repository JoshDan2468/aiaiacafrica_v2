/**
 * Admin repository
 *
 * Owns parameterized authentication and staff-management SQL. Password hashes
 * are available only to authentication/business services, never safe user DTOs.
 */

import type { QueryResultRow } from "pg";
import { getDatabasePool } from "../config/database";
import type { AdminRecord, AdminRole, AdminUser } from "../types/admin";
import type { DatabaseExecutor } from "../types/database";

interface AdminRow extends QueryResultRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export interface CreateAdminInput {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: AdminRole;
  readonly createdByAdminId?: string;
}

export interface AdminAuthRepository {
  findByEmail(
    email: string,
    executor?: DatabaseExecutor,
  ): Promise<AdminRecord | null>;
  findById(
    id: string,
    executor?: DatabaseExecutor,
  ): Promise<AdminRecord | null>;
  updateLastLogin(id: string, loggedInAt: Date): Promise<void>;
  create(
    input: CreateAdminInput,
    executor?: DatabaseExecutor,
  ): Promise<AdminRecord>;
}

export interface AdminRepository extends AdminAuthRepository {
  listUsers(): Promise<AdminUser[]>;
  findUserByIdForUpdate(
    id: string,
    executor: DatabaseExecutor,
  ): Promise<AdminUser | null>;
  lockSuperAdminState(executor: DatabaseExecutor): Promise<void>;
  countActiveSuperAdmins(executor: DatabaseExecutor): Promise<number>;
  updateActive(
    id: string,
    isActive: boolean,
    updatedAt: Date,
    executor: DatabaseExecutor,
  ): Promise<AdminUser>;
  updateRole(
    id: string,
    role: AdminRole,
    updatedAt: Date,
    executor: DatabaseExecutor,
  ): Promise<AdminUser>;
}

export class DuplicateAdminEmailError extends Error {
  constructor() {
    super("An admin with this email already exists");
    this.name = "DuplicateAdminEmailError";
  }
}

function mapAdmin(row: AdminRow): AdminRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
  };
}

function mapAdminUser(row: AdminRow): AdminUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

function database(executor?: DatabaseExecutor): DatabaseExecutor {
  return executor ?? requireDatabasePool();
}

const adminSelection = `
  SELECT id, full_name, email, password_hash, role, is_active, last_login_at, created_at
  FROM admins
`;

export const postgresAdminRepository: AdminRepository = {
  async findByEmail(email, executor) {
    const result = await database(executor).query<AdminRow>(
      `${adminSelection} WHERE email = $1 LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    return row ? mapAdmin(row) : null;
  },

  async findById(id, executor) {
    const result = await database(executor).query<AdminRow>(
      `${adminSelection} WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapAdmin(row) : null;
  },

  async updateLastLogin(id, loggedInAt) {
    await requireDatabasePool().query(
      `UPDATE admins
       SET last_login_at = $2, updated_at = $2
       WHERE id = $1`,
      [id, loggedInAt],
    );
  },

  async create(input, executor) {
    try {
      const result = await database(executor).query<AdminRow>(
        `INSERT INTO admins (id, full_name, email, password_hash, role, created_by_admin_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, email, password_hash, role, is_active, last_login_at, created_at`,
        [
          input.id,
          input.fullName,
          input.email,
          input.passwordHash,
          input.role,
          input.createdByAdminId ?? null,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Admin creation returned no record");
      return mapAdmin(row);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505" &&
        "constraint" in error &&
        error.constraint === "admins_email_key"
      ) {
        throw new DuplicateAdminEmailError();
      }
      throw error;
    }
  },

  async listUsers() {
    const result = await requireDatabasePool().query<AdminRow>(
      `${adminSelection} ORDER BY created_at DESC, full_name ASC`,
    );
    return result.rows.map(mapAdminUser);
  },

  async findUserByIdForUpdate(id, executor) {
    const result = await executor.query<AdminRow>(
      `${adminSelection} WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapAdminUser(row) : null;
  },

  async lockSuperAdminState(executor) {
    // Serializes the count-and-disable rule so concurrent requests cannot remove all owners.
    await executor.query(
      "SELECT pg_advisory_xact_lock(hashtext('aiaiac:active-super-admins'))",
    );
  },

  async countActiveSuperAdmins(executor) {
    const result = await executor.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM admins
       WHERE role = 'SUPER_ADMIN' AND is_active = true`,
    );
    return Number(result.rows[0]?.count ?? 0);
  },

  async updateActive(id, isActive, updatedAt, executor) {
    const result = await executor.query<AdminRow>(
      `UPDATE admins
       SET is_active = $2, updated_at = $3
       WHERE id = $1
       RETURNING id, full_name, email, password_hash, role, is_active, last_login_at, created_at`,
      [id, isActive, updatedAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Admin status update returned no record");
    return mapAdminUser(row);
  },

  async updateRole(id, role, updatedAt, executor) {
    const result = await executor.query<AdminRow>(
      `UPDATE admins
       SET role = $2, updated_at = $3
       WHERE id = $1
       RETURNING id, full_name, email, password_hash, role, is_active, last_login_at, created_at`,
      [id, role, updatedAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Admin role update returned no record");
    return mapAdminUser(row);
  },
};
