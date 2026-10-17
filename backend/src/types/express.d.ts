import "express-serve-static-core";
import type {
  AuthorizedStudentEvidenceUpload,
  StudentEvidenceType,
} from "./studentEvidence";

declare module "express-serve-static-core" {
  interface Request {
    rawBody?: Buffer;
  }

  interface Locals {
    studentEvidenceAuthorization?: AuthorizedStudentEvidenceUpload;
    studentEvidenceType?: StudentEvidenceType;
  }
}
