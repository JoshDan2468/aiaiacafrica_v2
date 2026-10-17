import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createStudentVerificationController } from "../src/controllers/studentVerification.controller";
import { createStudentEvidenceUploadRateLimiter } from "../src/middleware/studentEvidenceRateLimit.middleware";
import {
  enforceStudentEvidenceRequestSize,
  parseStudentEvidenceMultipart,
} from "../src/middleware/studentEvidenceUpload.middleware";
import type {
  CreatePendingStudentEvidenceInput,
  StudentEvidenceRepository,
} from "../src/repositories/studentEvidence.repository";
import type { StudentVerificationRepository } from "../src/repositories/studentVerification.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createApiRouter } from "../src/routes";
import { createStudentVerificationRouter } from "../src/routes/studentVerification.routes";
import {
  StudentEvidenceAuthorizationError,
  StudentEvidenceNotAvailableError,
  StudentEvidenceService,
  hashStudentContinuationToken,
} from "../src/services/studentEvidence.service";
import { StudentVerificationService } from "../src/services/studentVerification.service";
import { LocalStudentEvidenceStorage } from "../src/studentEvidence/local.storage";
import type { MalwareScanner } from "../src/studentEvidence/malwareScanner";
import type { StudentEvidenceStorage } from "../src/studentEvidence/storage";
import type { AdminRole } from "../src/types/admin";
import {
  evidenceReadiness,
  type AuthorizedStudentEvidenceUpload,
  type StoredStudentEvidence,
  type StudentEvidenceDocumentStatus,
  type StudentEvidenceList,
  type StudentEvidenceMetadata,
  type StudentEvidenceScanStatus,
} from "../src/types/studentEvidence";
import type {
  CreatedStudentApplication,
  StudentApplicationInput,
  StudentVerificationListFilters,
  StudentVerificationListResult,
} from "../src/types/studentVerification";
import {
  InvalidStudentEvidenceFileError,
  maximumStudentEvidenceBytes,
  StudentEvidenceFileTooLargeError,
  validateStudentEvidenceFile,
  type UploadedEvidenceFile,
} from "../src/validators/studentEvidence.validator";

const reference = "AIAIAC-DEL-ABCDEFGH";
const otherReference = "AIAIAC-DEL-OTHER123";
const token = "A".repeat(43);
const otherToken = "B".repeat(43);
const verificationId = "11111111-1111-4111-8111-111111111111";
const otherVerificationId = "22222222-2222-4222-8222-222222222222";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlY4AAAAASUVORK5CYII=",
  "base64",
);
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z",
  "base64",
);
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);

function uploaded(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): UploadedEvidenceFile {
  return { originalname, mimetype, size: buffer.length, buffer };
}

class MemoryStorage implements StudentEvidenceStorage {
  readonly files = new Map<string, Buffer>();
  readonly storedKeys: string[] = [];

  async store(key: string, bytes: Buffer) {
    if (this.files.has(key)) throw new Error("collision");
    this.files.set(key, Buffer.from(bytes));
    this.storedKeys.push(key);
  }

  async retrieve(key: string) {
    const bytes = this.files.get(key);
    if (!bytes) throw new Error("missing");
    return Buffer.from(bytes);
  }

  async delete(key: string) {
    this.files.delete(key);
  }
}

class FixedScanner implements MalwareScanner {
  constructor(
    private readonly result: Exclude<StudentEvidenceScanStatus, "PENDING">,
  ) {}

  async scan() {
    return this.result;
  }
}

class MemoryEvidenceRepository implements StudentEvidenceRepository {
  readonly documents: StoredStudentEvidence[] = [];
  readonly createInputs: CreatePendingStudentEvidenceInput[] = [];
  readonly accesses: Array<{ evidenceId: string; adminId: string }> = [];
  readonly authorizations = new Map<
    string,
    {
      tokenHash: string;
      expiresAt: Date;
      authorization: AuthorizedStudentEvidenceUpload;
    }
  >();

  constructor() {
    this.authorizations.set(reference, {
      tokenHash: hashStudentContinuationToken(token),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      authorization: {
        studentVerificationId: verificationId,
        registrationReference: reference,
        verificationStatus: "NOT_SUBMITTED",
      },
    });
    this.authorizations.set(otherReference, {
      tokenHash: hashStudentContinuationToken(otherToken),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      authorization: {
        studentVerificationId: otherVerificationId,
        registrationReference: otherReference,
        verificationStatus: "NOT_SUBMITTED",
      },
    });
  }

  async authorizeContinuation(
    registrationReference: string,
    tokenHash: string,
    now: Date,
  ) {
    const value = this.authorizations.get(registrationReference);
    return value && value.tokenHash === tokenHash && value.expiresAt > now
      ? value.authorization
      : null;
  }

  async createPending(input: CreatePendingStudentEvidenceInput) {
    this.createInputs.push(input);
    const current = this.documents.find(
      (document) =>
        document.studentVerificationId === input.studentVerificationId &&
        document.category === input.category &&
        document.supersededAt === null,
    );
    if (current) {
      const index = this.documents.indexOf(current);
      this.documents[index] = {
        ...current,
        supersededAt: new Date("2026-09-21T10:00:00.000Z"),
      };
    }
    const document: StoredStudentEvidence = {
      id: `internal-${input.publicId}`,
      evidenceId: input.publicId,
      studentVerificationId: input.studentVerificationId,
      registrationReference:
        input.studentVerificationId === verificationId
          ? reference
          : otherReference,
      evidenceType: input.evidenceType,
      category: input.category,
      displayFilename: input.displayFilename,
      storageKey: input.storageKey,
      detectedMimeType: input.detectedMimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      scanStatus: "PENDING",
      documentStatus: "PENDING_SCAN",
      supersededAt: null,
      uploadedAt: new Date("2026-09-21T10:00:00.000Z"),
    };
    this.documents.push(document);
    return document;
  }

  async completeScan(
    evidenceId: string,
    scanStatus: Exclude<StudentEvidenceScanStatus, "PENDING">,
    documentStatus: StudentEvidenceDocumentStatus,
  ) {
    const document = this.documents.find(
      (item) => item.evidenceId === evidenceId,
    );
    if (!document) throw new Error("missing evidence");
    const updated = { ...document, scanStatus, documentStatus };
    this.documents[this.documents.indexOf(document)] = updated;
    return updated;
  }

  async listCurrent(
    studentVerificationId: string,
  ): Promise<StudentEvidenceList> {
    const items = this.documents.filter(
      (document) =>
        document.studentVerificationId === studentVerificationId &&
        document.supersededAt === null,
    );
    return { items, readiness: evidenceReadiness(items) };
  }

  async findAvailableForAdmin(
    registrationReference: string,
    evidenceId: string,
  ) {
    return (
      this.documents.find(
        (document) =>
          document.registrationReference === registrationReference &&
          document.evidenceId === evidenceId &&
          document.supersededAt === null &&
          document.scanStatus === "CLEAN" &&
          document.documentStatus === "AVAILABLE",
      ) ?? null
    );
  }

  async recordAccess(evidence: StoredStudentEvidence, adminId: string) {
    this.accesses.push({ evidenceId: evidence.evidenceId, adminId });
  }
}

class StubStudentRepository implements StudentVerificationRepository {
  async createApplication(
    _input: StudentApplicationInput,
    nextReference: () => string,
    _continuation: { readonly tokenHash: string; readonly expiresAt: Date },
  ): Promise<
    Omit<
      CreatedStudentApplication,
      "continuationToken" | "continuationTokenExpiresAt"
    >
  > {
    return {
      reference: nextReference(),
      registrationStatus: "SUBMITTED",
      paymentStatus: "PENDING",
      verificationStatus: "NOT_SUBMITTED",
      paymentAvailable: false,
      email: "student@example.com",
      emailVerificationStatus: "UNVERIFIED",
    };
  }

  async list(
    filters: StudentVerificationListFilters,
  ): Promise<StudentVerificationListResult> {
    return { items: [], total: 0, page: filters.page, limit: filters.limit };
  }
}

function createEvidenceService(
  scanStatus: Exclude<StudentEvidenceScanStatus, "PENDING"> = "CLEAN",
) {
  const repository = new MemoryEvidenceRepository();
  const storage = new MemoryStorage();
  let storageSequence = 0;
  let publicSequence = 0;
  const service = new StudentEvidenceService(
    repository,
    storage,
    new FixedScanner(scanStatus),
    () => new Date("2026-09-21T12:00:00.000Z"),
    () => (++storageSequence).toString(16).padStart(64, "0"),
    () =>
      `00000000-0000-4000-8000-${(++publicSequence).toString().padStart(12, "0")}`,
  );
  return { service, repository, storage };
}

async function authorize(service: StudentEvidenceService) {
  return service.authorizeContinuation(reference, token);
}

function createRouteApp(
  scanStatus: Exclude<StudentEvidenceScanStatus, "PENDING"> = "CLEAN",
) {
  const context = createEvidenceService(scanStatus);
  const studentService = new StudentVerificationService(
    new StubStudentRepository(),
    () => reference,
  );
  const controller = createStudentVerificationController(
    studentService,
    context.service,
  );
  const requireAuth: RequestHandler = (request, response, next) => {
    const role = request.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      response
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    response.locals.admin = {
      id: "admin-1",
      fullName: "Test Admin",
      email: "admin@example.com",
      role,
    };
    next();
  };
  const application = createApplication({
    apiRouter: createApiRouter({
      studentVerificationRouter: createStudentVerificationRouter({
        controller,
        rateLimiter: (_request, _response, next) => next(),
        uploadRateLimiter: createStudentEvidenceUploadRateLimiter({
          windowMs: 60_000,
          max: 1,
        }),
        requestSizeLimit: enforceStudentEvidenceRequestSize,
        multipartParser: parseStudentEvidenceMultipart,
      }),
      adminRouter: createAdminRouter({
        requireAuth,
        studentVerificationController: controller,
      }),
    }),
  });
  return { application, ...context };
}

test("valid PDF content is accepted", async () => {
  const result = await validateStudentEvidenceFile(
    uploaded("student-id.pdf", "application/pdf", pdf),
  );
  assert.equal(result.detectedMimeType, "application/pdf");
});

test("valid JPEG content is accepted and .jpeg is canonicalized", async () => {
  const result = await validateStudentEvidenceFile(
    uploaded("student-id.jpeg", "image/jpeg", jpeg),
  );
  assert.equal(result.canonicalExtension, ".jpg");
});

test("valid PNG content is accepted", async () => {
  const result = await validateStudentEvidenceFile(
    uploaded("student-id.png", "image/png", png),
  );
  assert.equal(result.detectedMimeType, "image/png");
});

test("disallowed extension is rejected", async () => {
  await assert.rejects(
    validateStudentEvidenceFile(
      uploaded("student-id.docx", "application/pdf", pdf),
    ),
    InvalidStudentEvidenceFileError,
  );
});

test("spoofed declared Content-Type is rejected", async () => {
  await assert.rejects(
    validateStudentEvidenceFile(
      uploaded("student-id.png", "application/pdf", png),
    ),
    InvalidStudentEvidenceFileError,
  );
});

test("renamed executable content is rejected by signature detection", async () => {
  await assert.rejects(
    validateStudentEvidenceFile(
      uploaded(
        "student-id.pdf",
        "application/pdf",
        Buffer.from("MZ executable"),
      ),
    ),
    InvalidStudentEvidenceFileError,
  );
});

test("files over 5 MB are rejected", async () => {
  const bytes = Buffer.alloc(maximumStudentEvidenceBytes + 1, 1);
  await assert.rejects(
    validateStudentEvidenceFile(uploaded("student-id.png", "image/png", bytes)),
    StudentEvidenceFileTooLargeError,
  );
});

test("double-extension filenames are rejected", async () => {
  await assert.rejects(
    validateStudentEvidenceFile(
      uploaded("student-id.exe.pdf", "application/pdf", pdf),
    ),
    InvalidStudentEvidenceFileError,
  );
});

test("traversal, absolute, control, null-style, and overlong names are rejected", async () => {
  for (const name of [
    "../student-id.pdf",
    "C:\\student-id.pdf",
    "student\u0000-id.pdf",
    "student%00-id.pdf",
    `${"a".repeat(181)}.pdf`,
  ]) {
    await assert.rejects(
      validateStudentEvidenceFile(uploaded(name, "application/pdf", pdf)),
      InvalidStudentEvidenceFileError,
    );
  }
});

test("server generates the physical key and never uses the display filename", async () => {
  const { service, repository, storage } = createEvidenceService();
  await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("My Current Student ID.png", "image/png", png),
  );
  assert.match(storage.storedKeys[0]!, /^[0-9a-f]{64}\.png$/);
  assert.notEqual(storage.storedKeys[0], "My Current Student ID.png");
  assert.equal(
    repository.createInputs[0]?.displayFilename,
    "My Current Student ID.png",
  );
});

test("SHA-256 checksum and metadata are generated server-side without database bytes", async () => {
  const { service, repository } = createEvidenceService();
  await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  const input = repository.createInputs[0]!;
  assert.equal(
    input.checksumSha256,
    createHash("sha256").update(png).digest("hex"),
  );
  assert.equal(input.detectedMimeType, "image/png");
  assert.equal(input.sizeBytes, png.length);
  assert.equal("bytes" in input, false);
});

test("continuation token is application-scoped and cannot upload to another application", async () => {
  const { service } = createEvidenceService();
  await assert.rejects(
    service.authorizeContinuation(otherReference, token),
    StudentEvidenceAuthorizationError,
  );
});

test("invalid and expired continuation authorization are rejected", async () => {
  const { service, repository } = createEvidenceService();
  await assert.rejects(
    service.authorizeContinuation(reference, "C".repeat(43)),
    StudentEvidenceAuthorizationError,
  );
  repository.authorizations.get(reference)!.expiresAt = new Date(
    "2020-01-01T00:00:00.000Z",
  );
  await assert.rejects(
    service.authorizeContinuation(reference, token),
    StudentEvidenceAuthorizationError,
  );
});

test("CLEAN scan makes evidence AVAILABLE", async () => {
  const { service } = createEvidenceService("CLEAN");
  const result = await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  assert.equal(result.evidence.scanStatus, "CLEAN");
  assert.equal(result.evidence.documentStatus, "AVAILABLE");
});

test("INFECTED scan makes evidence REJECTED", async () => {
  const { service } = createEvidenceService("INFECTED");
  const result = await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  assert.equal(result.evidence.documentStatus, "REJECTED");
});

test("UNAVAILABLE and ERROR scans fail closed as PENDING_SCAN", async () => {
  for (const status of ["UNAVAILABLE", "ERROR"] as const) {
    const { service } = createEvidenceService(status);
    const result = await service.upload(
      await authorize(service),
      "CURRENT_STUDENT_ID",
      uploaded("student-id.png", "image/png", png),
    );
    assert.equal(result.evidence.scanStatus, status);
    assert.equal(result.evidence.documentStatus, "PENDING_SCAN");
  }
});

test("replacement receives a new key and does not overwrite prior bytes", async () => {
  const { service, repository, storage } = createEvidenceService();
  const authorization = await authorize(service);
  const first = await service.upload(
    authorization,
    "CURRENT_STUDENT_ID",
    uploaded("first.png", "image/png", png),
  );
  const second = await service.upload(
    authorization,
    "CURRENT_STUDENT_ID",
    uploaded("replacement.png", "image/png", png),
    first.evidence.evidenceId,
  );
  assert.equal(new Set(storage.storedKeys).size, 2);
  assert.notEqual(
    repository.documents[0]?.storageKey,
    repository.documents[1]?.storageKey,
  );
  assert.equal(repository.documents[0]?.supersededAt instanceof Date, true);
  assert.equal(second.evidence.displayFilename, "replacement.png");
});

test("minimum readiness requires available Student ID plus one enrolment proof", () => {
  const base: StudentEvidenceMetadata = {
    evidenceId: "00000000-0000-4000-8000-000000000001",
    evidenceType: "CURRENT_STUDENT_ID",
    category: "STUDENT_ID",
    displayFilename: "id.png",
    detectedMimeType: "image/png",
    sizeBytes: png.length,
    checksumSha256: "a".repeat(64),
    scanStatus: "CLEAN",
    documentStatus: "AVAILABLE",
    uploadedAt: new Date(),
  };
  assert.equal(evidenceReadiness([base]).minimumEvidenceReady, false);
  assert.equal(
    evidenceReadiness([
      base,
      {
        ...base,
        evidenceId: "00000000-0000-4000-8000-000000000002",
        evidenceType: "ENROLMENT_LETTER",
        category: "ENROLMENT",
      },
    ]).minimumEvidenceReady,
    true,
  );
});

test("evidence upload never approves or changes the verification state", async () => {
  const { service, repository } = createEvidenceService();
  await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  assert.equal(
    repository.authorizations.get(reference)?.authorization.verificationStatus,
    "NOT_SUBMITTED",
  );
});

test("local storage blocks traversal keys and stores only under its private root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aiaiac-evidence-"));
  try {
    const storage = new LocalStudentEvidenceStorage(root);
    await assert.rejects(storage.store("../escape.pdf", pdf));
    const key = `${"a".repeat(64)}.pdf`;
    await storage.store(key, pdf);
    assert.deepEqual(await readFile(path.join(root, key)), pdf);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("specific upload rate limit rejects rapid repeated attempts", async () => {
  const { application } = createRouteApp();
  const first = request(application)
    .post(`/api/student-delegate-applications/${reference}/evidence`)
    .set("x-aiaiac-continuation-token", token)
    .set("x-aiaiac-evidence-type", "CURRENT_STUDENT_ID")
    .attach("file", png, {
      filename: "student-id.png",
      contentType: "image/png",
    });
  await first.expect(201);
  await request(application)
    .post(`/api/student-delegate-applications/${reference}/evidence`)
    .set("x-aiaiac-continuation-token", token)
    .set("x-aiaiac-evidence-type", "ENROLMENT_LETTER")
    .attach("file", png, {
      filename: "enrolment.png",
      contentType: "image/png",
    })
    .expect(429);
});

test("anonymous Admin evidence retrieval is 401", async () => {
  const { application } = createRouteApp();
  await request(application)
    .get(
      `/api/admin/student-verifications/${reference}/evidence/00000000-0000-4000-8000-000000000001/download`,
    )
    .expect(401);
});

test("ADMIN, FINANCE, and COMMUNICATIONS cannot retrieve Student evidence", async () => {
  const { application } = createRouteApp();
  for (const role of ["ADMIN", "FINANCE", "COMMUNICATIONS"]) {
    await request(application)
      .get(
        `/api/admin/student-verifications/${reference}/evidence/00000000-0000-4000-8000-000000000001/download`,
      )
      .set("x-test-role", role)
      .expect(403);
  }
});

test("authorized Admin role retrieves only AVAILABLE evidence with safe headers", async () => {
  const { application, service, repository } = createRouteApp("CLEAN");
  const result = await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  const response = await request(application)
    .get(
      `/api/admin/student-verifications/${reference}/evidence/${result.evidence.evidenceId}/download`,
    )
    .set("x-test-role", "REGISTRATION_MANAGER")
    .expect(200);
  assert.equal(response.headers["content-type"], "image/png");
  assert.match(response.headers["content-disposition"] ?? "", /^attachment;/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.match(response.headers["cache-control"] ?? "", /private, no-store/);
  assert.equal(
    JSON.stringify(response.headers).includes("000000000000000000000000"),
    false,
  );
  assert.deepEqual(repository.accesses, [
    { evidenceId: result.evidence.evidenceId, adminId: "admin-1" },
  ]);
});

test("SUPER_ADMIN can retrieve AVAILABLE evidence", async () => {
  const { application, service } = createRouteApp("CLEAN");
  const result = await service.upload(
    await authorize(service),
    "CURRENT_STUDENT_ID",
    uploaded("student-id.png", "image/png", png),
  );
  await request(application)
    .get(
      `/api/admin/student-verifications/${reference}/evidence/${result.evidence.evidenceId}/download`,
    )
    .set("x-test-role", "SUPER_ADMIN")
    .expect(200);
});

test("REJECTED or unscanned evidence cannot be retrieved", async () => {
  for (const status of ["INFECTED", "UNAVAILABLE"] as const) {
    const { service } = createEvidenceService(status);
    const result = await service.upload(
      await authorize(service),
      "CURRENT_STUDENT_ID",
      uploaded("student-id.png", "image/png", png),
    );
    await assert.rejects(
      service.downloadForAdmin(
        reference,
        result.evidence.evidenceId,
        "admin-1",
      ),
      StudentEvidenceNotAvailableError,
    );
  }
});

test("public evidence listing rejects a valid token scoped to another reference", async () => {
  const { application } = createRouteApp();
  await request(application)
    .get(`/api/student-delegate-applications/${otherReference}/evidence`)
    .set("x-aiaiac-continuation-token", token)
    .expect(401);
});

test("migration stores metadata only and adds constrained lifecycle and audit events", async () => {
  const migration = await readFile(
    path.join(
      process.cwd(),
      "migrations/20260921000000000_student-evidence-storage.ts",
    ),
    "utf8",
  );
  assert.match(migration, /createTable\("student_evidence_documents"/);
  assert.match(migration, /sha256_checksum/);
  assert.match(migration, /PENDING_SCAN.*AVAILABLE.*REJECTED/s);
  assert.match(migration, /STUDENT_EVIDENCE_ACCESSED/);
  assert.doesNotMatch(migration, /bytea|document_contents|file_bytes/i);
});
