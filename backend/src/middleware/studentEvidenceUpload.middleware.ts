import type { RequestHandler } from "express";
import multer from "multer";
import { createPublicError } from "./error.middleware";
import {
  maximumStudentEvidenceBytes,
  maximumStudentEvidenceRequestBytes,
} from "../validators/studentEvidence.validator";

const multipart = multer({
  storage: multer.memoryStorage(),
  preservePath: true,
  limits: {
    fileSize: maximumStudentEvidenceBytes,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

export const enforceStudentEvidenceRequestSize: RequestHandler = (
  request,
  _response,
  next,
) => {
  const contentLength = Number(request.header("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > maximumStudentEvidenceRequestBytes
  ) {
    next(
      createPublicError(413, "Evidence upload exceeds the request size limit"),
    );
    return;
  }
  next();
};

export const parseStudentEvidenceMultipart: RequestHandler = (
  request,
  response,
  next,
) => {
  multipart.single("file")(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(
        createPublicError(
          error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
          error.code === "LIMIT_FILE_SIZE"
            ? "Evidence file exceeds the 5 MB limit"
            : "Invalid evidence upload request",
        ),
      );
      return;
    }
    next(error);
  });
};
