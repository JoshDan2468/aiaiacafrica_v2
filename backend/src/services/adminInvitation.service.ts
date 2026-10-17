/**
 * Admin invitation service
 *
 * Creates, sends, validates, revokes, resends, and accepts staff invitations.
 * Raw tokens are transient; repositories receive SHA-256 hashes only.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { withTransaction } from "../config/database";
import type { EmailService } from "../email/email.service";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import type { AdminInvitationRepository } from "../repositories/adminInvitation.repository";
import {
  DuplicateAdminEmailError,
  type AdminRepository,
} from "../repositories/admin.repository";
import type {
  AdminInvitation,
  AdminInvitationRecord,
  AdminInvitationStatus,
  SafeAdmin,
} from "../types/admin";
import type { TransactionRunner } from "../types/database";
import type {
  AcceptAdminInvitationInput,
  CreateAdminInvitationInput,
} from "../validators/adminUser.validator";
import type { PasswordOperations } from "./auth.service";
import {
  hashPassword,
  verifyPassword,
  dummyPasswordHash,
} from "./password.service";
import { toSafeAdmin } from "./auth.service";

const defaultPasswords: PasswordOperations = {
  hash: hashPassword,
  verify: verifyPassword,
  dummyHash: dummyPasswordHash,
};

export class InvitationConflictError extends Error {}
export class InvitationNotFoundError extends Error {}
export class InvitationStateError extends Error {}
export class InvitationEmailDomainError extends Error {}
export class InvitationAccountExistsError extends Error {}
export class InvitationSuperAdminPermissionError extends Error {}

export type PublicInvitationValidation =
  | { readonly status: "INVALID" }
  | { readonly status: "EXPIRED" | "USED" | "REVOKED" }
  | {
      readonly status: "VALID";
      readonly invitation: {
        readonly fullName: string;
        readonly email: string;
        readonly role: AdminInvitation["role"];
        readonly expiresAt: Date;
      };
    };

export type InvitationAcceptanceResult =
  | { readonly status: "ACCEPTED"; readonly admin: SafeAdmin }
  | {
      readonly status:
        "INVALID" | "EXPIRED" | "USED" | "REVOKED" | "ACCOUNT_EXISTS";
    };

interface AdminInvitationServiceOptions {
  readonly invitations: AdminInvitationRepository;
  readonly admins: AdminRepository;
  readonly audits: AdminAuditRepository;
  readonly emailService: EmailService;
  readonly expiryHours: number;
  readonly allowedEmailDomains: readonly string[];
  readonly passwords?: PasswordOperations;
  readonly runInTransaction?: TransactionRunner;
  readonly now?: () => Date;
  readonly generateToken?: () => string;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function safeInvitation(record: AdminInvitationRecord): AdminInvitation {
  const { tokenHash: _tokenHash, ...safe } = record;
  return safe;
}

function currentStatus(
  invitation: AdminInvitationRecord,
  now: Date,
): AdminInvitationStatus {
  if (invitation.acceptedAt) return "ACCEPTED";
  if (invitation.revokedAt) return "REVOKED";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "PENDING";
}

export class AdminInvitationService {
  private readonly passwords: PasswordOperations;
  private readonly runInTransaction: TransactionRunner;
  private readonly now: () => Date;
  private readonly generateToken: () => string;

  constructor(private readonly options: AdminInvitationServiceOptions) {
    this.passwords = options.passwords ?? defaultPasswords;
    this.runInTransaction = options.runInTransaction ?? withTransaction;
    this.now = options.now ?? (() => new Date());
    this.generateToken =
      options.generateToken ?? (() => randomBytes(32).toString("base64url"));
  }

  private expiresAt(now: Date): Date {
    return new Date(now.getTime() + this.options.expiryHours * 60 * 60 * 1_000);
  }

  private enforceAllowedDomain(email: string): void {
    if (this.options.allowedEmailDomains.length === 0) return;
    const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
    if (!this.options.allowedEmailDomains.includes(domain)) {
      throw new InvitationEmailDomainError();
    }
  }

  private async deliver(
    invitation: AdminInvitationRecord,
    rawToken: string,
  ): Promise<boolean> {
    try {
      await this.options.emailService.sendAdminInvitation({
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        rawToken,
        expiresAt: invitation.expiresAt,
      });
      await this.options.invitations.markEmailSent(invitation.id, this.now());
      return true;
    } catch {
      return false;
    }
  }

  /** Creates one pending invitation and audits it before attempting email delivery. */
  async create(
    actor: SafeAdmin,
    input: CreateAdminInvitationInput,
  ): Promise<{ invitation: AdminInvitation; emailSent: boolean }> {
    if (input.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new InvitationSuperAdminPermissionError();
    }
    this.enforceAllowedDomain(input.email);
    const rawToken = this.generateToken();
    const tokenHash = hashToken(rawToken);
    const createdAt = this.now();
    const invitation = await this.runInTransaction(async (client) => {
      await this.options.invitations.lockEmail(input.email, client);
      if (await this.options.admins.findByEmail(input.email, client)) {
        throw new InvitationAccountExistsError();
      }
      if (
        await this.options.invitations.findPendingByEmail(
          input.email,
          createdAt,
          client,
        )
      ) {
        throw new InvitationConflictError();
      }
      const created = await this.options.invitations.create(
        {
          id: randomUUID(),
          fullName: input.name,
          email: input.email,
          role: input.role,
          tokenHash,
          invitedByAdminId: actor.id,
          expiresAt: this.expiresAt(createdAt),
          createdAt,
        },
        client,
      );
      await this.options.audits.create(
        {
          adminId: actor.id,
          action: "USER_INVITED",
          entityType: "ADMIN_INVITATION",
          entityId: created.id,
          metadata: { role: created.role, email: created.email },
          createdAt,
        },
        client,
      );
      return created;
    });
    return {
      invitation: safeInvitation(invitation),
      emailSent: await this.deliver(invitation, rawToken),
    };
  }

  list(): Promise<AdminInvitation[]> {
    return this.options.invitations.list();
  }

  async validate(rawToken: string): Promise<PublicInvitationValidation> {
    const invitation = await this.options.invitations.findByTokenHash(
      hashToken(rawToken),
    );
    if (!invitation) return { status: "INVALID" };
    const status = currentStatus(invitation, this.now());
    if (status === "PENDING") {
      return {
        status: "VALID",
        invitation: {
          fullName: invitation.fullName,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      };
    }
    return { status: status === "ACCEPTED" ? "USED" : status };
  }

  async revoke(actor: SafeAdmin, id: string): Promise<AdminInvitation> {
    return this.runInTransaction(async (client) => {
      const invitation = await this.options.invitations.findById(
        id,
        client,
        true,
      );
      if (!invitation) throw new InvitationNotFoundError();
      const revokedAt = this.now();
      if (currentStatus(invitation, revokedAt) !== "PENDING") {
        throw new InvitationStateError();
      }
      const revoked = await this.options.invitations.revoke(
        id,
        revokedAt,
        client,
      );
      await this.options.audits.create(
        {
          adminId: actor.id,
          action: "INVITATION_REVOKED",
          entityType: "ADMIN_INVITATION",
          entityId: id,
          metadata: { role: invitation.role },
          createdAt: revokedAt,
        },
        client,
      );
      return safeInvitation(revoked);
    });
  }

  /** Rotates the token before sending so a previously issued link immediately stops working. */
  async resend(
    actor: SafeAdmin,
    id: string,
  ): Promise<{ invitation: AdminInvitation; emailSent: boolean }> {
    const rawToken = this.generateToken();
    const tokenHash = hashToken(rawToken);
    const invitation = await this.runInTransaction(async (client) => {
      const existing = await this.options.invitations.findById(
        id,
        client,
        true,
      );
      if (!existing) throw new InvitationNotFoundError();
      const updatedAt = this.now();
      if (currentStatus(existing, updatedAt) !== "PENDING") {
        throw new InvitationStateError();
      }
      const rotated = await this.options.invitations.rotateToken(
        id,
        tokenHash,
        this.expiresAt(updatedAt),
        updatedAt,
        client,
      );
      await this.options.audits.create(
        {
          adminId: actor.id,
          action: "INVITATION_RESENT",
          entityType: "ADMIN_INVITATION",
          entityId: id,
          metadata: { role: existing.role },
          createdAt: updatedAt,
        },
        client,
      );
      return rotated;
    });
    return {
      invitation: safeInvitation(invitation),
      emailSent: await this.deliver(invitation, rawToken),
    };
  }

  /** Creates the account and consumes the invitation in one locked transaction. */
  async accept(
    input: AcceptAdminInvitationInput,
  ): Promise<InvitationAcceptanceResult> {
    const tokenHash = hashToken(input.token);
    const initial = await this.options.invitations.findByTokenHash(tokenHash);
    if (!initial) return { status: "INVALID" };
    const initialStatus = currentStatus(initial, this.now());
    if (initialStatus !== "PENDING") {
      return { status: initialStatus === "ACCEPTED" ? "USED" : initialStatus };
    }

    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.runInTransaction(async (client) => {
        const invitation = await this.options.invitations.findByTokenHash(
          tokenHash,
          client,
          true,
        );
        if (!invitation) return { status: "INVALID" } as const;
        const acceptedAt = this.now();
        const status = currentStatus(invitation, acceptedAt);
        if (status !== "PENDING") {
          return { status: status === "ACCEPTED" ? "USED" : status } as const;
        }
        if (await this.options.admins.findByEmail(invitation.email, client)) {
          return { status: "ACCOUNT_EXISTS" } as const;
        }
        const admin = await this.options.admins.create(
          {
            id: randomUUID(),
            fullName: invitation.fullName,
            email: invitation.email,
            passwordHash,
            role: invitation.role,
            createdByAdminId: invitation.invitedByAdminId,
          },
          client,
        );
        await this.options.invitations.markAccepted(
          invitation.id,
          acceptedAt,
          client,
        );
        await this.options.audits.create(
          {
            adminId: admin.id,
            action: "INVITATION_ACCEPTED",
            entityType: "ADMIN_INVITATION",
            entityId: invitation.id,
            metadata: { role: invitation.role },
            createdAt: acceptedAt,
          },
          client,
        );
        return { status: "ACCEPTED", admin: toSafeAdmin(admin) } as const;
      });
    } catch (error) {
      if (error instanceof DuplicateAdminEmailError)
        return { status: "ACCOUNT_EXISTS" };
      throw error;
    }
  }
}
