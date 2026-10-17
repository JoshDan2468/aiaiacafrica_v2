import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  analysisCategories,
  criterionKeys,
  draftRubric,
  minimizeAnalysisContent,
  promptVersion,
  validateAnalysis,
  type AnalysisResult,
} from "./analysis";
import {
  AnalysisProviderError,
  providerDiagnosticsSchema,
  type ProviderDiagnostics,
  type AnalysisProvider,
  type AnalysisUsage,
} from "./analysisProvider";
import { createGeminiTestProvider, type GeminiTestOptions } from "./geminiAnalysis.provider";

export const verifiedGeminiTestModel = {
  id: "gemini-3.8-flash",
  checkedOn: "2026-10-16",
  modelSource: "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash",
  pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
} as const;
const corpusHash = "360d32ed766ec03a6a1a5f810e104a570589f8545b92bb4197f6461fadfdad4c";
const range = z.tuple([z.number().int(), z.number().int()]);
const caseSchema = z.strictObject({
  id: z.string().regex(/^S(?:0[1-9]|1[0-9]|20)$/),
  title: z.string(),
  abstractBody: z.string(),
  keywords: z.string(),
  expected: z.strictObject({
    categories: z.array(z.enum(analysisCategories)),
    scoreRange: range,
    criteriaRanges: z.array(range).length(5),
    summaryFacts: z.array(z.string()),
    issues: z.array(z.string()),
    forbiddenClaims: z.array(z.string()),
  }),
});
export type SyntheticCase = z.infer<typeof caseSchema>;
export interface EvaluationConfig extends GeminiTestOptions {
  intervalMs: number;
  maxAttempts: number;
  run: string;
  caseIds: string[];
}
/** Local-only argument parsing and fixture verification; no credentials or provider calls. */
export function readEvaluationSelection(args: readonly string[]): {
  mode: "execute" | "dry-run";
  run: string;
  caseIds: string[];
} {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (["--execute", "--dry-run", "--all"].includes(flag)) {
      if (options.has(flag)) throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
      options.set(flag, "true");
      continue;
    }
    if (
      !["--case", "--cases", "--run"].includes(flag) ||
      options.has(flag) ||
      !args[i + 1] ||
      args[i + 1]!.startsWith("--")
    ) {
      throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
    }
    options.set(flag, args[++i]!);
  }
  const run = options.get("--run");
  if (
    !run ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(run) ||
    ["--execute", "--dry-run"].filter((flag) => options.has(flag)).length !== 1 ||
    ["--case", "--cases", "--all"].filter((flag) => options.has(flag)).length !== 1
  ) {
    throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
  }
  const corpus = loadSyntheticCorpus();
  const caseIds = options.has("--all")
    ? corpus.map((item) => item.id)
    : options.has("--case")
      ? [options.get("--case")!]
      : options
          .get("--cases")!
          .split(",")
          .map((id) => id.trim());
  const knownIds = new Set(corpus.map((item) => item.id));
  if (
    !caseIds.length ||
    new Set(caseIds).size !== caseIds.length ||
    caseIds.some((id) => !knownIds.has(id))
  ) {
    throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
  }
  return { mode: options.has("--dry-run") ? "dry-run" : "execute", run, caseIds };
}

export function readEvaluationConfig(
  env: NodeJS.ProcessEnv,
  args: readonly string[],
): EvaluationConfig {
  if (
    env.NODE_ENV !== "test" ||
    env.GEMINI_TEST_ALLOW_EXTERNAL !== "true" ||
    !args.includes("--execute")
  )
    throw new AnalysisProviderError("EXTERNAL_EXECUTION_NOT_APPROVED");
  if (env.GEMINI_TEST_FREE_TIER_CONFIRMED !== "true")
    throw new AnalysisProviderError("TEST_PROJECT_FREE_TIER_NOT_CONFIRMED");
  const parsed = z
    .object({
      GEMINI_API_KEY_TEST: z.string().trim().min(1),
      GEMINI_MODEL_TEST: z.literal(verifiedGeminiTestModel.id),
      GEMINI_TEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(60000),
      GEMINI_TEST_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1000).max(8000).default(4096),
      GEMINI_TEST_INTERVAL_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
      GEMINI_TEST_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(2).default(1),
    })
    .safeParse(env);
  if (!parsed.success) throw new AnalysisProviderError("INVALID_TEST_CONFIGURATION");
  const selection = readEvaluationSelection(args);
  if (selection.mode !== "execute") throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
  const p = parsed.data;
  return {
    apiKey: p.GEMINI_API_KEY_TEST,
    model: p.GEMINI_MODEL_TEST,
    timeoutMs: p.GEMINI_TEST_TIMEOUT_MS,
    maxOutputTokens: p.GEMINI_TEST_MAX_OUTPUT_TOKENS,
    intervalMs: p.GEMINI_TEST_INTERVAL_MS,
    maxAttempts: p.GEMINI_TEST_MAX_ATTEMPTS,
    run: selection.run,
    caseIds: selection.caseIds,
  };
}
export function loadSyntheticCorpus(): SyntheticCase[] {
  // Fixed repository fixture only. No custom files, database or submission endpoint is accepted.
  const text = readFileSync(
    resolve(__dirname, "../../test/fixtures/abstract-ai-synthetic.json"),
    "utf8",
  ).replace(/\r\n/g, "\n");
  if (createHash("sha256").update(text).digest("hex") !== corpusHash)
    throw new AnalysisProviderError("SYNTHETIC_FIXTURE_CHANGED");
  const cases = z.array(caseSchema).length(20).parse(JSON.parse(text));
  if (new Set(cases.map((item) => item.id)).size !== 20)
    throw new AnalysisProviderError("INVALID_SYNTHETIC_FIXTURE");
  return cases;
}
interface Attempt {
  status: string;
  dispatchedAt: string;
  completedAt?: string;
  usage: AnalysisUsage | null;
  diagnostics?: ProviderDiagnostics;
}
interface CaseEvaluation {
  id: string;
  status: string;
  attempts: Attempt[];
  result: AnalysisResult | null;
  comparison: ReturnType<typeof compareResult> | null;
}
export interface EvaluationReport {
  run: string;
  model: string;
  fixtureHash: string;
  promptVersion: string;
  modelDocumentation: typeof verifiedGeminiTestModel;
  caseIds: string[];
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  cases: CaseEvaluation[];
  usage: {
    knownInputTokens: number;
    knownOutputTokensIncludingThoughts: number;
    unknownUsageAttempts: number;
    dispatchedAttempts: number;
  };
}
export function compareResult(item: SyntheticCase, result: AnalysisResult) {
  return {
    categoriesMatch:
      JSON.stringify([...item.expected.categories].sort()) ===
      JSON.stringify(result.categories.map((entry) => entry.category).sort()),
    totalWithinExpectedRange:
      result.advisoryScore >= item.expected.scoreRange[0] &&
      result.advisoryScore <= item.expected.scoreRange[1],
    criteriaWithinExpectedRanges: Object.fromEntries(
      criterionKeys.map((key, i) => [
        key,
        result.criteria[key].score >= item.expected.criteriaRanges[i]![0] &&
          result.criteria[key].score <= item.expected.criteriaRanges[i]![1],
      ]),
    ),
    expected: item.expected,
    narrativeReview: "REQUIRES_HUMAN_REVIEW",
    consistencyReview: "NOT_MEASURED_SINGLE_RUN",
  };
}
/** CLI-only orchestration. Dependencies allow all execution behavior to be tested without network. */
export async function runGeminiEvaluation(
  config: EvaluationConfig,
  dependencies: {
    providerFactory?: (config: GeminiTestOptions) => Promise<AnalysisProvider>;
    wait?: (ms: number) => Promise<void>;
    outputRoot?: string;
  } = {},
): Promise<EvaluationReport> {
  const corpus = loadSyntheticCorpus();
  if (
    config.model !== verifiedGeminiTestModel.id ||
    !config.apiKey ||
    !config.caseIds.length ||
    new Set(config.caseIds).size !== config.caseIds.length ||
    config.caseIds.some((id) => !corpus.some((item) => item.id === id))
  )
    throw new AnalysisProviderError("INVALID_TEST_CONFIGURATION");
  const directory = resolve(
    dependencies.outputRoot ?? resolve(__dirname, "../../../output/gemini-evaluation/runs"),
    config.run,
  );
  // Public entry point also guards traversal when used directly in a test or another script.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(config.run))
    throw new AnalysisProviderError("INVALID_TEST_ARGUMENTS");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lockPath = resolve(directory, "run.lock");
  let lock: number;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch {
    throw new AnalysisProviderError("RUN_LOCKED_REVIEW_BEFORE_RETRY");
  }
  const path = resolve(directory, "results.json");
  const wait = dependencies.wait ?? ((ms) => new Promise<void>((accept) => setTimeout(accept, ms)));
  const write = (report: EvaluationReport) => {
    report.updatedAt = new Date().toISOString();
    const all = report.cases.flatMap((item) => item.attempts);
    report.usage = {
      knownInputTokens: all.reduce((n, item) => n + (item.usage?.inputTokens ?? 0), 0),
      knownOutputTokensIncludingThoughts: all.reduce(
        (n, item) => n + (item.usage?.outputTokens ?? 0),
        0,
      ),
      unknownUsageAttempts: all.filter((item) => !item.usage).length,
      dispatchedAttempts: all.length,
    };
    const temp = resolve(directory, `${randomUUID()}.tmp`);
    const safe = JSON.stringify(
      report,
      (_key, value: unknown) =>
        typeof value === "string" ? value.split(config.apiKey).join("[REDACTED]") : value,
      2,
    );
    writeFileSync(temp, safe, { mode: 0o600 });
    // Windows scanners can briefly lock the destination. Retry only the local atomic
    // replacement, never the provider call; exhausting this bound fails closed.
    for (let attempt = 0; ; attempt++) {
      try {
        renameSync(temp, path);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (attempt >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(code ?? "")) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * (attempt + 1));
      }
    }
  };
  try {
    const now = new Date().toISOString();
    const report: EvaluationReport = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : {
          run: config.run,
          model: config.model,
          fixtureHash: corpusHash,
          promptVersion,
          modelDocumentation: verifiedGeminiTestModel,
          caseIds: config.caseIds,
          maxAttempts: config.maxAttempts,
          createdAt: now,
          updatedAt: now,
          status: "PREPARED",
          cases: config.caseIds.map((id) => ({
            id,
            status: "NOT_RUN",
            attempts: [],
            result: null,
            comparison: null,
          })),
          usage: {
            knownInputTokens: 0,
            knownOutputTokensIncludingThoughts: 0,
            unknownUsageAttempts: 0,
            dispatchedAttempts: 0,
          },
        };
    if (
      report.fixtureHash !== corpusHash ||
      report.model !== config.model ||
      report.promptVersion !== promptVersion ||
      JSON.stringify(report.caseIds) !== JSON.stringify(config.caseIds) ||
      report.maxAttempts !== config.maxAttempts
    )
      throw new AnalysisProviderError("RUN_CONFIGURATION_CHANGED");
    if (
      report.cases.some((item) => item.attempts.some((attempt) => attempt.status === "DISPATCHED"))
    ) {
      for (const item of report.cases)
        for (const attempt of item.attempts)
          if (attempt.status === "DISPATCHED") {
            attempt.status = "OUTCOME_UNKNOWN";
            item.status = "OUTCOME_UNKNOWN";
          }
      report.status = "HALTED_UNCERTAIN";
      write(report);
      return report;
    }
    // A rerun of an existing journal never repeats failed, uncertain or completed cases.
    if (report.status !== "PREPARED") return report;
    write(report);
    if (!dependencies.providerFactory) {
      // Recheck the CLI gates at the real-network boundary, even for programmatic callers.
      const approved = readEvaluationConfig(process.env, process.argv.slice(2));
      if (JSON.stringify(approved) !== JSON.stringify(config)) {
        throw new AnalysisProviderError("INVALID_TEST_CONFIGURATION");
      }
    }
    const provider = await (dependencies.providerFactory ?? createGeminiTestProvider)(config);
    let dispatched = false;
    for (const entry of report.cases) {
      const item = corpus.find((value) => value.id === entry.id)!;
      const content = minimizeAnalysisContent(
        {
          title: item.title,
          abstractBody: item.abstractBody,
          keywords: item.keywords,
        },
        [],
      );
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        if (dispatched)
          await wait(attempt > 1 ? Math.max(60000, config.intervalMs) : config.intervalMs);
        const record: Attempt = {
          status: "DISPATCHED",
          dispatchedAt: new Date().toISOString(),
          usage: null,
        };
        entry.attempts.push(record);
        entry.status = "PROCESSING";
        report.status = "RUNNING";
        write(report);
        dispatched = true;
        try {
          const response = await provider.analyze(content, draftRubric, config.model);
          record.usage = response.usage;
          entry.result = validateAnalysis(response.value, content, draftRubric);
          entry.comparison = compareResult(item, entry.result);
          entry.status = "COMPLETED";
          record.status = "COMPLETED";
        } catch (error) {
          const code = error instanceof AnalysisProviderError ? error.code : "INVALID_RESPONSE";
          record.usage = error instanceof AnalysisProviderError ? (error.usage ?? null) : null;
          const diagnostics = providerDiagnosticsSchema.safeParse(
            error instanceof AnalysisProviderError ? error.diagnostics : undefined,
          );
          if (diagnostics.success) record.diagnostics = diagnostics.data;
          record.status = code;
          entry.status = code;
          if (code === "PROVIDER_RATE_LIMIT" && attempt < config.maxAttempts) {
            record.completedAt = new Date().toISOString();
            write(report);
            continue;
          }
          if (["OUTCOME_UNKNOWN", "PROVIDER_RATE_LIMIT", "PROVIDER_CONFIGURATION"].includes(code))
            report.status = "HALTED";
        }
        record.completedAt = new Date().toISOString();
        write(report);
        break;
      }
      if (report.status === "HALTED") break;
    }
    if (report.status !== "HALTED")
      report.status = report.cases.every((item) => item.status === "COMPLETED")
        ? "COMPLETED"
        : "COMPLETED_WITH_FAILURES";
    write(report);
    return report;
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}
