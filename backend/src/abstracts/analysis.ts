import { createHash } from "node:crypto";
import { z } from "zod";

export const analysisCategories = [
  "Artificial Intelligence",
  "Automation",
  "Cybersecurity",
  "Asset Integrity",
] as const;
export const criterionKeys = [
  "relevance",
  "clarity",
  "methodology",
  "contribution",
  "completeness",
] as const;
export const promptVersion = "abstract-screening-v1";
const boundedText = (max: number) => z.string().trim().min(1).max(max);
const criterionSchema = z.strictObject({
  score: z.number().int().min(0).max(4),
  explanation: boundedText(800),
  evidence: boundedText(500).nullable(),
});
export const analysisResponseSchema = z.strictObject({
  summary: boundedText(1200),
  categories: z
    .array(
      z.strictObject({
        category: z.enum(analysisCategories),
        explanation: boundedText(500),
      }),
    )
    .max(4),
  criteria: z.strictObject({
    relevance: criterionSchema,
    clarity: criterionSchema,
    methodology: criterionSchema,
    contribution: criterionSchema,
    completeness: criterionSchema,
  }),
  issues: z.array(boundedText(500)).max(8),
  scoreExplanation: boundedText(1000),
});
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type AnalysisResult = AnalysisResponse & { advisoryScore: number };
export const rubricSchema = z
  .strictObject({
    version: boundedText(80),
    status: z.literal("DRAFT"),
    weights: z.strictObject({
      relevance: z.number().int().min(0).max(100),
      clarity: z.number().int().min(0).max(100),
      methodology: z.number().int().min(0).max(100),
      contribution: z.number().int().min(0).max(100),
      completeness: z.number().int().min(0).max(100),
    }),
  })
  .refine((rubric) => Object.values(rubric.weights).reduce((a, b) => a + b, 0) === 100);
export type AnalysisRubric = z.infer<typeof rubricSchema>;
export const draftRubric: AnalysisRubric = {
  version: "draft-1",
  status: "DRAFT",
  weights: { relevance: 30, clarity: 15, methodology: 20, contribution: 25, completeness: 10 },
};
export function rubricFingerprint(rubric: AnalysisRubric): string {
  // PostgreSQL jsonb reorders object keys; the hash must not depend on insertion order.
  return createHash("sha256")
    .update(
      JSON.stringify([
        rubric.version,
        rubric.status,
        ...criterionKeys.map((key) => rubric.weights[key]),
      ]),
    )
    .digest("hex");
}

export interface AnalysisContent {
  title: string;
  abstractBody: string;
  keywords: string | null;
}
/** Local minimization only. Author fields never form part of the provider payload. */
export function minimizeAnalysisContent(
  content: AnalysisContent,
  identity: readonly string[],
): AnalysisContent {
  const redact = (text: string) => {
    let value = text;
    for (const personal of [...identity].sort((a, b) => b.length - a.length)) {
      if (personal.trim().length < 3) continue;
      const escaped = personal.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      value = value.replace(
        new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"),
        "[redacted]",
      );
    }
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
      .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[redacted]");
  };
  return {
    title: redact(content.title),
    abstractBody: redact(content.abstractBody),
    keywords: content.keywords ? redact(content.keywords) : null,
  };
}
export function validateAnalysis(
  value: unknown,
  content: AnalysisContent,
  rubric: AnalysisRubric,
): AnalysisResult {
  const result = analysisResponseSchema.parse(value);
  if (new Set(result.categories.map((item) => item.category)).size !== result.categories.length)
    throw new Error("DuplicateAnalysisCategory");
  const source = [content.title, content.abstractBody, content.keywords ?? ""].join("\n");
  for (const key of criterionKeys) {
    const evidence = result.criteria[key].evidence;
    if (evidence && !source.includes(evidence)) throw new Error("UnsupportedAnalysisEvidence");
  }
  const advisoryScore = Math.round(
    criterionKeys.reduce(
      (sum, key) => sum + (result.criteria[key].score / 4) * rubric.weights[key],
      0,
    ),
  );
  return { ...result, advisoryScore };
}

export type AnalysisStatus =
  | "DISABLED"
  | "NOT_QUEUED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "OUTDATED"
  | "UNAVAILABLE";
export interface AnalysisView {
  status: AnalysisStatus;
  canRetry: boolean;
  failureCode?: string;
  result?: AnalysisResult;
  sourceRevision?: string;
  rubric?: AnalysisRubric;
  promptVersion?: string;
  model?: string;
  createdAt?: Date;
  completedAt?: Date | null;
}
