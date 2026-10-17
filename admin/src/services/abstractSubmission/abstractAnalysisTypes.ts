export type AnalysisStatus =
  | "DISABLED"
  | "NOT_QUEUED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "OUTDATED"
  | "UNAVAILABLE";
export interface AnalysisCriterion {
  score: number;
  explanation: string;
  evidence: string | null;
}
export interface AbstractAnalysis {
  status: AnalysisStatus;
  canRetry: boolean;
  failureCode?: string;
  sourceRevision?: string;
  rubric?: { version: string; status: "DRAFT"; weights: Record<string, number> };
  promptVersion?: string;
  model?: string;
  createdAt?: string;
  completedAt?: string | null;
  result?: {
    summary: string;
    advisoryScore: number;
    scoreExplanation: string;
    categories: { category: string; explanation: string }[];
    criteria: Record<
      "relevance" | "clarity" | "methodology" | "contribution" | "completeness",
      AnalysisCriterion
    >;
    issues: string[];
  };
}
export const analysisStatusLabels: Record<AnalysisStatus, string> = {
  DISABLED: "Disabled",
  NOT_QUEUED: "Not queued",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  OUTDATED: "Outdated",
  UNAVAILABLE: "Unavailable",
};
