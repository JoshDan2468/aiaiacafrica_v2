import { withTransaction } from "../config/database";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import type { AccreditationRepository } from "../repositories/accreditation.repository";
import type { SafeAdmin } from "../types/admin";
import type {
  Accreditation,
  AccreditationPage,
  ConferenceEvent,
} from "../types/accreditation";
import type { TransactionRunner } from "../types/database";
import type {
  AccreditationCreateInput,
  AccreditationListInput,
} from "../validators/accreditation.validator";

export class AccreditationNotFoundError extends Error {}
export class AccreditationSourceError extends Error {}
export class AccreditationConflictError extends Error {}
export class AccreditationTransitionError extends Error {}

export class AccreditationService {
  constructor(
    private readonly repository: AccreditationRepository,
    private readonly audits: AdminAuditRepository,
    private readonly runInTransaction: TransactionRunner = withTransaction,
    private readonly now: () => Date = () => new Date(),
  ) {}

  events(): Promise<ConferenceEvent[]> {
    return this.repository.events();
  }
  list(input: AccreditationListInput): Promise<AccreditationPage> {
    return this.repository.list(
      input.eventId,
      input.category,
      input.status,
      input.page ?? 1,
    );
  }
  async get(id: string): Promise<Accreditation> {
    const found = await this.repository.findById(id);
    if (!found) throw new AccreditationNotFoundError();
    return found;
  }

  async create(
    actor: SafeAdmin,
    input: AccreditationCreateInput,
  ): Promise<Accreditation> {
    try {
      return await this.runInTransaction(async (db) => {
        const event = await this.repository.findEvent(input.eventId, db);
        if (!event || !event.isActive) throw new AccreditationSourceError();
        let sourceType:
          "SPONSOR_APPLICATION" | "EXHIBITOR_APPLICATION" | "ADMIN_INTAKE" =
          "ADMIN_INTAKE";
        let sponsorApplicationId: string | null = null;
        let exhibitorApplicationId: string | null = null;
        let organizationName = input.organizationName ?? null;
        if (
          input.category === "SPONSOR_REPRESENTATIVE" ||
          input.category === "EXHIBITOR_REPRESENTATIVE"
        ) {
          const kind =
            input.category === "SPONSOR_REPRESENTATIVE"
              ? "SPONSOR"
              : "EXHIBITOR";
          const application = await this.repository.findApplication(
            kind,
            input.sourceApplicationReference!,
            db,
          );
          if (
            !application ||
            application.event_year !== event.year ||
            application.status === "DECLINED"
          )
            throw new AccreditationSourceError();
          sourceType =
            kind === "SPONSOR"
              ? "SPONSOR_APPLICATION"
              : "EXHIBITOR_APPLICATION";
          if (kind === "SPONSOR") sponsorApplicationId = application.id;
          else exhibitorApplicationId = application.id;
          organizationName = application.organization_name;
        }
        const created = await this.repository.create(
          {
            eventId: event.id,
            category: input.category,
            fullName: input.fullName,
            email: input.email,
            organizationName,
            country: input.country ?? null,
            sourceType,
            sponsorApplicationId,
            exhibitorApplicationId,
            createdByAdminId: actor.id,
          },
          db,
        );
        await this.audits.create(
          {
            adminId: actor.id,
            action: "ACCREDITATION_CREATED",
            entityType: "EVENT_ACCREDITATION",
            entityId: created.id,
            metadata: {
              eventCode: event.code,
              category: created.category,
              sourceType,
              sourceReference: created.sourceReference,
            },
            createdAt: this.now(),
          },
          db,
        );
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AccreditationConflictError();
      throw error;
    }
  }

  async updateStatus(
    actor: SafeAdmin,
    id: string,
    status: "APPROVED" | "REVOKED",
  ): Promise<Accreditation> {
    return this.runInTransaction(async (db) => {
      const current = await this.repository.findByIdForUpdate(id, db);
      if (!current) throw new AccreditationNotFoundError();
      if (
        current.sourceType === "DELEGATE_REGISTRATION" ||
        current.status === "REVOKED" ||
        (current.sourceType !== "ADMIN_INTAKE" && status === "APPROVED") ||
        (status === "APPROVED" && current.status !== "PENDING")
      ) {
        throw new AccreditationTransitionError();
      }
      if (current.status === status) return current;
      const updated = await this.repository.updateStatus(
        id,
        status,
        actor.id,
        this.now(),
        db,
      );
      await this.audits.create(
        {
          adminId: actor.id,
          action: "ACCREDITATION_STATUS_CHANGED",
          entityType: "EVENT_ACCREDITATION",
          entityId: id,
          metadata: {
            previousStatus: current.status,
            status,
            category: current.category,
            eventCode: current.eventCode,
          },
          createdAt: this.now(),
        },
        db,
      );
      return updated;
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
