import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { StudentEvidenceRepository } from "../repositories/studentEvidence.repository";
import type { MalwareScanner } from "../studentEvidence/malwareScanner";
import type { StudentEvidenceStorage } from "../studentEvidence/storage";
import {
  evidenceCategoryFor,
  type AuthorizedStudentEvidenceUpload,
  type StudentEvidenceDocumentStatus,
  type StudentEvidenceList,
  type StudentEvidenceMetadata,
  type StudentEvidenceScanStatus,
  type StudentEvidenceType,
} from "../types/studentEvidence";
import {
  validateStudentEvidenceFile,
  type UploadedEvidenceFile,
} from "../validators/studentEvidence.validator";

export class StudentEvidenceAuthorizationError extends Error {}
export class StudentEvidenceNotAvailableError extends Error {}

export function hashStudentContinuationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createStudentContinuationToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface StudentEvidenceUploadResult {
  readonly evidence: StudentEvidenceMetadata;
  readonly readiness: StudentEvidenceList["readiness"];
}

export interface StudentEvidenceDownload {
  readonly bytes: Buffer;
  readonly displayFilename: string;
  readonly detectedMimeType: StudentEvidenceMetadata["detectedMimeType"];
}

export class StudentEvidenceService {
  constructor(
    private readonly repository: StudentEvidenceRepository,
    private readonly storage: StudentEvidenceStorage,
    private readonly scanner: MalwareScanner,
    private readonly now: () => Date = () => new Date(),
    private readonly createStorageId: () => string = () =>
      randomBytes(32).toString("hex"),
    private readonly createPublicId: () => string = randomUUID,
  ) {}

  async authorizeContinuation(
    registrationReference: string,
    continuationToken: string,
  ): Promise<AuthorizedStudentEvidenceUpload> {
    const authorization = await this.repository.authorizeContinuation(
      registrationReference,
      hashStudentContinuationToken(continuationToken),
      this.now(),
    );
    if (!authorization) {
      throw new StudentEvidenceAuthorizationError();
    }
    return authorization;
  }

  list(
    authorization: AuthorizedStudentEvidenceUpload,
  ): Promise<StudentEvidenceList> {
    return this.repository.listCurrent(authorization.studentVerificationId);
  }

  async upload(
    authorization: AuthorizedStudentEvidenceUpload,
    evidenceType: StudentEvidenceType,
    file: UploadedEvidenceFile,
    replacementEvidenceId?: string,
  ): Promise<StudentEvidenceUploadResult> {
    const validated = await validateStudentEvidenceFile(file);
    const storageKey = `${this.createStorageId()}${validated.canonicalExtension}`;
    await this.storage.store(storageKey, validated.bytes);

    let pending: StudentEvidenceMetadata;
    try {
      pending = await this.repository.createPending({
        studentVerificationId: authorization.studentVerificationId,
        publicId: this.createPublicId(),
        evidenceType,
        category: evidenceCategoryFor(evidenceType),
        displayFilename: validated.displayFilename,
        storageKey,
        detectedMimeType: validated.detectedMimeType,
        sizeBytes: validated.sizeBytes,
        checksumSha256: validated.checksumSha256,
        ...(replacementEvidenceId ? { replacementEvidenceId } : {}),
      });
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }

    let scanStatus: Exclude<StudentEvidenceScanStatus, "PENDING">;
    try {
      scanStatus = await this.scanner.scan({
        bytes: validated.bytes,
        detectedMimeType: validated.detectedMimeType,
        checksumSha256: validated.checksumSha256,
      });
    } catch {
      scanStatus = "ERROR";
    }
    const documentStatus: StudentEvidenceDocumentStatus =
      scanStatus === "CLEAN"
        ? "AVAILABLE"
        : scanStatus === "INFECTED"
          ? "REJECTED"
          : "PENDING_SCAN";
    const evidence = await this.repository.completeScan(
      pending.evidenceId,
      scanStatus,
      documentStatus,
    );
    const current = await this.repository.listCurrent(
      authorization.studentVerificationId,
    );
    return { evidence, readiness: current.readiness };
  }

  async downloadForAdmin(
    registrationReference: string,
    evidenceId: string,
    adminId: string,
  ): Promise<StudentEvidenceDownload> {
    const evidence = await this.repository.findAvailableForAdmin(
      registrationReference,
      evidenceId,
    );
    if (!evidence) throw new StudentEvidenceNotAvailableError();
    const bytes = await this.storage.retrieve(evidence.storageKey);
    await this.repository.recordAccess(evidence, adminId);
    return {
      bytes,
      displayFilename: evidence.displayFilename,
      detectedMimeType: evidence.detectedMimeType,
    };
  }
}
