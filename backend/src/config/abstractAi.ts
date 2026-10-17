import { z } from "zod";
import { draftRubric, rubricSchema, type AnalysisRubric } from "../abstracts/analysis";

export interface AbstractAiConfig {
  provider: "openai" | "gemini";
  pricingApprovedUntil?: string;
  apiKey: string;
  model: string;
  rubric: AnalysisRubric;
  maxAttempts: number;
  maxConcurrent: number;
  requestsPerMinute: number;
  timeoutMs: number;
  maxOutputTokens: number;
  maxInputTokens: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  dailyBudgetUsd: number;
  totalBudgetUsd: number;
}
const configSchema = z.object({
  ABSTRACT_AI_MODEL: z.string().trim().min(1).max(120),

  ABSTRACT_AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  ABSTRACT_AI_MAX_CONCURRENT: z.coerce.number().int().min(1).max(4).default(1),
  ABSTRACT_AI_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(6),
  ABSTRACT_AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(60000),
  ABSTRACT_AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(500).max(8000).default(2000),
  ABSTRACT_AI_INPUT_USD_PER_MILLION: z.coerce.number().positive().max(1000),
  ABSTRACT_AI_OUTPUT_USD_PER_MILLION: z.coerce.number().positive().max(1000),
  ABSTRACT_AI_DAILY_BUDGET_USD: z.coerce.number().positive().max(1000),
  ABSTRACT_AI_TOTAL_BUDGET_USD: z.coerce.number().positive().max(10000),
});
/** Fail closed for this optional feature without interrupting the existing application. */
export function loadAbstractAiConfig(source: NodeJS.ProcessEnv): AbstractAiConfig | null {
  if (
    source.ABSTRACT_AI_ENABLED !== "true" ||
    !["openai", "gemini"].includes(source.ABSTRACT_AI_PROVIDER ?? "") ||
    source.ABSTRACT_AI_DATA_APPROVED !== "true"
  )
    return null;
  const provider = source.ABSTRACT_AI_PROVIDER as "openai" | "gemini";
  const apiKey = (
    provider === "gemini" ? source.ABSTRACT_AI_GEMINI_API_KEY : source.ABSTRACT_AI_API_KEY
  )?.trim();
  if (!apiKey || (provider === "gemini" && apiKey === source.GEMINI_API_KEY_TEST)) return null;
  const parsed = configSchema.safeParse(source);
  if (!parsed.success) return null;
  if (provider === "openai" && parsed.data.ABSTRACT_AI_MODEL.startsWith("gemini-")) return null;
  if (
    provider === "gemini" &&
    (parsed.data.ABSTRACT_AI_MODEL !== "gemini-3.8-flash" ||
      source.ABSTRACT_AI_PRICING_CONFIRMED !== "true" ||
      !geminiPricingIsCurrent({
        provider,
        model: parsed.data.ABSTRACT_AI_MODEL,
        inputUsdPerMillion: parsed.data.ABSTRACT_AI_INPUT_USD_PER_MILLION,
        outputUsdPerMillion: parsed.data.ABSTRACT_AI_OUTPUT_USD_PER_MILLION,
        pricingApprovedUntil: source.ABSTRACT_AI_PRICING_APPROVED_UNTIL ?? "",
      }))
  )
    return null;
  let rubric = draftRubric;
  try {
    if (source.ABSTRACT_AI_RUBRIC_JSON)
      rubric = rubricSchema.parse(JSON.parse(source.ABSTRACT_AI_RUBRIC_JSON));
  } catch {
    return null;
  }
  const values = parsed.data;
  return {
    provider,
    apiKey,
    ...(provider === "gemini"
      ? { pricingApprovedUntil: source.ABSTRACT_AI_PRICING_APPROVED_UNTIL! }
      : {}),
    model: values.ABSTRACT_AI_MODEL,
    rubric,
    maxAttempts: values.ABSTRACT_AI_MAX_ATTEMPTS,
    maxConcurrent: values.ABSTRACT_AI_MAX_CONCURRENT,
    requestsPerMinute: values.ABSTRACT_AI_REQUESTS_PER_MINUTE,
    timeoutMs: values.ABSTRACT_AI_TIMEOUT_MS,
    maxOutputTokens: values.ABSTRACT_AI_MAX_OUTPUT_TOKENS,
    // UTF-8 bytes provide a deliberately conservative token ceiling, including schema/prompt.
    maxInputTokens: 64000,
    inputUsdPerMillion: values.ABSTRACT_AI_INPUT_USD_PER_MILLION,
    outputUsdPerMillion: values.ABSTRACT_AI_OUTPUT_USD_PER_MILLION,
    dailyBudgetUsd: values.ABSTRACT_AI_DAILY_BUDGET_USD,
    totalBudgetUsd: values.ABSTRACT_AI_TOTAL_BUDGET_USD,
  };
}

/** Conservative paid-rate floors, including the published January 2027 increase.
 * Free-tier eligibility never removes reservations. Reapproval is required within 30 days.
 * Official source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-16).
 */
export function geminiPricingIsCurrent(
  config: Pick<
    AbstractAiConfig,
    "provider" | "model" | "pricingApprovedUntil" | "inputUsdPerMillion" | "outputUsdPerMillion"
  >,
): boolean {
  if (config.provider !== "gemini") return true;
  const until = Date.parse(config.pricingApprovedUntil ?? "");
  const now = Date.now();
  return (
    config.model === "gemini-3.8-flash" &&
    Number.isFinite(until) &&
    until > now &&
    until <= now + 30 * 86400000 &&
    config.inputUsdPerMillion >= 1.5 &&
    config.outputUsdPerMillion >= 7.5 &&
    Number.isFinite(config.inputUsdPerMillion) &&
    Number.isFinite(config.outputUsdPerMillion)
  );
}
