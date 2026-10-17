import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  studentEvidenceTypes,
  type StudentEvidenceMimeType,
  type ValidatedStudentEvidenceFile,
} from "../types/studentEvidence";

export const maximumStudentEvidenceBytes = 5 * 1024 * 1024;
export const maximumStudentEvidenceRequestBytes =
  maximumStudentEvidenceBytes + 128 * 1024;

export const studentEvidenceReferenceParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
});

export const studentEvidenceReplacementParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
  evidenceId: z.string().uuid(),
});

export const studentEvidenceTypeSchema = z.enum(studentEvidenceTypes);
export const studentContinuationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

export interface UploadedEvidenceFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

const allowedDeclaredMimeTypes = new Set<StudentEvidenceMimeType>([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const expectedByExtension = {
  ".pdf": {
    mime: "application/pdf",
    detectedExtension: "pdf",
    canonical: ".pdf",
  },
  ".jpg": { mime: "image/jpeg", detectedExtension: "jpg", canonical: ".jpg" },
  ".jpeg": { mime: "image/jpeg", detectedExtension: "jpg", canonical: ".jpg" },
  ".png": { mime: "image/png", detectedExtension: "png", canonical: ".png" },
} as const;

export class InvalidStudentEvidenceFileError extends Error {}
export class StudentEvidenceFileTooLargeError extends Error {}

function validateDisplayFilename(originalName: string) {
  const normalized = originalName.normalize("NFC").trim();
  if (
    !normalized ||
    normalized.length > 180 ||
    normalized !== originalName ||
    /[\u0000-\u001f\u007f]/.test(normalized) ||
    /%00/i.test(normalized) ||
    /[/\\]/.test(normalized) ||
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    path.posix.basename(normalized) !== normalized ||
    path.win32.basename(normalized) !== normalized
  ) {
    throw new InvalidStudentEvidenceFileError("Unsafe evidence filename");
  }
  const extension = path.extname(normalized).toLowerCase();
  const expected =
    expectedByExtension[extension as keyof typeof expectedByExtension];
  const stem = normalized.slice(0, -extension.length);
  if (!expected || !stem || stem.includes(".")) {
    throw new InvalidStudentEvidenceFileError(
      "Unsupported or ambiguous evidence filename",
    );
  }
  return { normalized, expected };
}

export async function validateStudentEvidenceFile(
  file: UploadedEvidenceFile,
): Promise<ValidatedStudentEvidenceFile> {
  const sizeBytes = file.buffer.length;
  if (sizeBytes < 1)
    throw new InvalidStudentEvidenceFileError("Evidence file is empty");
  if (
    sizeBytes > maximumStudentEvidenceBytes ||
    file.size > maximumStudentEvidenceBytes
  ) {
    throw new StudentEvidenceFileTooLargeError("Evidence file exceeds 5 MB");
  }
  const { normalized, expected } = validateDisplayFilename(file.originalname);
  if (!allowedDeclaredMimeTypes.has(file.mimetype as StudentEvidenceMimeType)) {
    throw new InvalidStudentEvidenceFileError(
      "Unsupported declared evidence type",
    );
  }
  if (file.mimetype !== expected.mime) {
    throw new InvalidStudentEvidenceFileError(
      "Evidence filename and declared type do not match",
    );
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(file.buffer);
  if (
    !detected ||
    detected.mime !== expected.mime ||
    detected.ext !== expected.detectedExtension
  ) {
    throw new InvalidStudentEvidenceFileError(
      "Evidence content does not match its file type",
    );
  }

  return {
    displayFilename: normalized,
    detectedMimeType: detected.mime as StudentEvidenceMimeType,
    canonicalExtension: expected.canonical,
    sizeBytes,
    checksumSha256: createHash("sha256").update(file.buffer).digest("hex"),
    bytes: file.buffer,
  };
}
