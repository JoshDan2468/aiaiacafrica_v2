import {
  minimizeAnalysisContent,
  validateAnalysis,
  type AnalysisView,
} from "../abstracts/analysis";
import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "../abstracts/analysisProvider";
import { providerDiagnosticsSchema } from "../abstracts/analysisProvider";
import type {
  AbstractAnalysisRepository,
  AnalysisUsage,
} from "../repositories/abstractAnalysis.repository";

export class AbstractAnalysisService {
  constructor(
    private readonly repository: AbstractAnalysisRepository | null,
    private readonly provider: AnalysisProvider | null,
  ) {}
  async views(
    references: readonly string[],
  ): Promise<Record<string, AnalysisView>> {
    const fallback = (status: AnalysisView["status"]) =>
      Object.fromEntries(
        references.map((reference) => [reference, { status, canRetry: false }]),
      );
    if (!this.repository) return fallback("DISABLED");
    try {
      return {
        ...fallback("NOT_QUEUED"),
        ...(await this.repository.views(references)),
      };
    } catch {
      console.error("Abstract AI read unavailable", {
        code: "ANALYSIS_READ_UNAVAILABLE",
      });
      return fallback("UNAVAILABLE");
    }
  }
  async retry(reference: string, adminId: string): Promise<boolean> {
    return this.repository ? this.repository.retry(reference, adminId) : false;
  }
  async runOne(): Promise<boolean> {
    if (!this.repository || !this.provider) return false;
    try {
      await this.repository.reconcile?.();
    } catch {
      console.error("Abstract AI reconciliation unavailable", {
        code: "AI_RECONCILIATION_UNAVAILABLE",
      });
    }
    const claim = await this.repository.claim();
    if (!claim) return false;
    let usage: AnalysisUsage | undefined;
    try {
      const content = minimizeAnalysisContent(claim.content, claim.identity);
      const response = await this.provider.analyze(
        content,
        claim.rubric,
        claim.model,
      );
      usage = response.usage;
      let result;
      try {
        result = validateAnalysis(response.value, content, claim.rubric);
      } catch {
        throw new AnalysisProviderError("INVALID_RESPONSE");
      }
      await this.repository.complete(claim, result, usage);
    } catch (error) {
      const code =
        error instanceof AnalysisProviderError ? error.code : "OUTCOME_UNKNOWN";
      const retryable =
        error instanceof AnalysisProviderError && error.retryable;
      await this.repository.fail(
        claim,
        code,
        retryable,
        usage ??
          (error instanceof AnalysisProviderError ? error.usage : undefined),
        error instanceof AnalysisProviderError ? error.diagnostics : undefined,
      );
      const diagnostics = providerDiagnosticsSchema.safeParse(
        error instanceof AnalysisProviderError ? error.diagnostics : undefined,
      );
      console.error("Abstract AI attempt failed", {
        jobId: claim.id,
        code,
        ...(diagnostics.success ? { diagnostics: diagnostics.data } : {}),
      });
    }
    return true;
  }
}
