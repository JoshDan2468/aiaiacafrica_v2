/**
 * Admin user-management service
 *
 * Applies account safety rules before repository writes. The normal role API
 * cannot assign SUPER_ADMIN and cannot be used for self-escalation.
 */

import { withTransaction } from "../config/database";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import type { AdminRepository } from "../repositories/admin.repository";
import type { AdminUser, AssignableAdminRole, SafeAdmin } from "../types/admin";
import type { TransactionRunner } from "../types/database";

export class AdminUserNotFoundError extends Error {}
export class AdminUserSelfChangeError extends Error {}
export class AdminUserProtectedError extends Error {}
export class AdminUserPromotionPermissionError extends Error {}
export class AdminUserInactiveError extends Error {}

export class AdminUserService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly audits: AdminAuditRepository,
    private readonly runInTransaction: TransactionRunner = withTransaction,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(): Promise<AdminUser[]> {
    return this.admins.listUsers();
  }

  async updateStatus(
    actor: SafeAdmin,
    id: string,
    isActive: boolean,
  ): Promise<AdminUser> {
    if (actor.id === id && !isActive) throw new AdminUserSelfChangeError();
    return this.runInTransaction(async (client) => {
      const target = await this.admins.findUserByIdForUpdate(id, client);
      if (!target) throw new AdminUserNotFoundError();
      if (target.isActive === isActive) return target;
      if (target.role === "SUPER_ADMIN" && !isActive) {
        await this.admins.lockSuperAdminState(client);
        if ((await this.admins.countActiveSuperAdmins(client)) <= 1) {
          throw new AdminUserProtectedError();
        }
      }
      const changedAt = this.now();
      const updated = await this.admins.updateActive(
        id,
        isActive,
        changedAt,
        client,
      );
      await this.audits.create(
        {
          adminId: actor.id,
          action: isActive ? "USER_ENABLED" : "USER_DISABLED",
          entityType: "ADMIN_USER",
          entityId: id,
          metadata: { isActive },
          createdAt: changedAt,
        },
        client,
      );
      return updated;
    });
  }

  async updateRole(
    actor: SafeAdmin,
    id: string,
    role: AssignableAdminRole,
  ): Promise<AdminUser> {
    if (actor.id === id) throw new AdminUserSelfChangeError();
    return this.runInTransaction(async (client) => {
      const target = await this.admins.findUserByIdForUpdate(id, client);
      if (!target) throw new AdminUserNotFoundError();
      if (target.role === "SUPER_ADMIN") throw new AdminUserProtectedError();
      if (target.role === role) return target;
      const changedAt = this.now();
      const updated = await this.admins.updateRole(id, role, changedAt, client);
      await this.audits.create(
        {
          adminId: actor.id,
          action: "USER_ROLE_CHANGED",
          entityType: "ADMIN_USER",
          entityId: id,
          metadata: { previousRole: target.role, role },
          createdAt: changedAt,
        },
        client,
      );
      return updated;
    });
  }

  async promoteToSuperAdmin(actor: SafeAdmin, id: string): Promise<AdminUser> {
    if (actor.role !== "SUPER_ADMIN")
      throw new AdminUserPromotionPermissionError();
    if (actor.id === id) throw new AdminUserSelfChangeError();
    return this.runInTransaction(async (client) => {
      const target = await this.admins.findUserByIdForUpdate(id, client);
      if (!target) throw new AdminUserNotFoundError();
      if (!target.isActive) throw new AdminUserInactiveError();
      if (target.role === "SUPER_ADMIN") throw new AdminUserProtectedError();
      const changedAt = this.now();
      const updated = await this.admins.updateRole(
        id,
        "SUPER_ADMIN",
        changedAt,
        client,
      );
      await this.audits.create(
        {
          adminId: actor.id,
          action: "USER_ROLE_CHANGED",
          entityType: "ADMIN_USER",
          entityId: id,
          metadata: {
            targetEmail: target.email,
            previousRole: target.role,
            role: "SUPER_ADMIN",
          },
          createdAt: changedAt,
        },
        client,
      );
      return updated;
    });
  }
}
