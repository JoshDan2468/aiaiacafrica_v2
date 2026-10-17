import type {
  GenerateContentParameters,
  GenerateContentResponse,
  GoogleGenAIOptions,
  ThinkingLevel,
} from "@google/genai" with { "resolution-mode": "import" };
import { z } from "zod";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  analysisResponseSchema,
  promptVersion,
  validateAnalysis,
  type AnalysisContent,
  type AnalysisRubric,
} from "./analysis";
import {
  AnalysisProviderError,
  analysisInstructions,
  providerDiagnosticsSchema,
  type AnalysisProvider,
  type AnalysisUsage,
  type ProviderDiagnostics,
} from "./analysisProvider";

export interface GeminiProviderOptions {
  strictUsage?: boolean;
  maxInputTokens?: number;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
}
export type GeminiTestOptions = GeminiProviderOptions;
export interface GeminiClient {
  models: {
    generateContent(
      request: GenerateContentParameters,
    ): Promise<GenerateContentResponse>;
  };
}
const count = z.number().int().min(0).max(10_000_000);
const usageSchema = z.object({
  promptTokenCount: count,
  candidatesTokenCount: count.optional(),
  thoughtsTokenCount: count.optional(),
  cachedContentTokenCount: count.optional(),
  totalTokenCount: count.optional(),
});

// Read the installed SDK metadata, not a credential-bearing environment value.
const sdkVersion = (() => {
  try {
    const metadata: unknown = JSON.parse(
      readFileSync(
        join(dirname(require.resolve("@google/genai")), "../../package.json"),
        "utf8",
      ),
    );
    return z
      .object({
        version: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/),
      })
      .parse(metadata).version;
  } catch {
    return "unknown";
  }
})();

function ownField(error: unknown, key: string): unknown {
  try {
    if (typeof error !== "object" || error === null) return undefined;
    const field = Object.getOwnPropertyDescriptor(error, key);
    return field && "value" in field ? field.value : undefined;
  } catch {
    return undefined;
  }
}

function statuslessCategory(error: unknown): ProviderDiagnostics["category"] {
  let current = error;
  for (let depth = 0; depth < 3 && current; depth++) {
    const name = ownField(current, "name");
    const code = ownField(current, "code");
    if (
      [
        "TimeoutError",
        "RequestTimeoutError",
        "APIConnectionTimeoutError",
      ].includes(name as string) ||
      [
        "ETIMEDOUT",
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT",
      ].includes(code as string)
    )
      return "SDK_TIMEOUT";
    current = ownField(current, "cause");
  }
  const name = ownField(error, "name");
  const code = ownField(error, "code");
  if (
    ["AbortError", "APIConnectionError", "TypeError"].includes(
      name as string,
    ) ||
    ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(
      code as string,
    )
  )
    return "TRANSPORT_ERROR";
  return "MISSING_HTTP_STATUS";
}

function safeHttpDiagnostics(error: unknown): ProviderDiagnostics {
  // Never read messages, headers or response bodies, or coerce arbitrary objects.
  let raw: unknown;
  try {
    if (typeof error === "object" && error !== null) {
      const field = Object.getOwnPropertyDescriptor(error, "status");
      if (field && !("value" in field))
        return { httpStatus: null, category: "INVALID_HTTP_STATUS" };
      raw = field?.value;
    }
  } catch {
    return { httpStatus: null, category: "INVALID_HTTP_STATUS" };
  }
  if (raw === undefined)
    return { httpStatus: null, category: statuslessCategory(error) };
  const status =
    typeof raw === "string" && /^[45]\d{2}$/.test(raw) ? Number(raw) : raw;
  if (
    typeof status !== "number" ||
    !Number.isInteger(status) ||
    status < 400 ||
    status > 599
  ) {
    return { httpStatus: null, category: "INVALID_HTTP_STATUS" };
  }
  const categories: Partial<Record<number, ProviderDiagnostics["category"]>> = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    429: "RATE_LIMITED",
  };
  return {
    httpStatus: status,
    category:
      categories[status] ?? (status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR"),
  };
}

/** Explicit key, endpoint and retry settings prevent SDK environment fallbacks or hidden retries. */
export function geminiClientOptions(
  options: GeminiTestOptions,
): GoogleGenAIOptions {
  if (!options.apiKey.trim())
    throw new AnalysisProviderError("TEST_KEY_REQUIRED");
  return {
    apiKey: options.apiKey,
    vertexai: false,
    enterprise: false,
    httpOptions: {
      baseUrl: "https://generativelanguage.googleapis.com",
      apiVersion: "v1beta",
      timeout: options.timeoutMs,
      retryOptions: { attempts: 1 },
    },
  };
}
export async function createGeminiProvider(
  options: GeminiTestOptions,
): Promise<GeminiAnalysisProvider> {
  const { GoogleGenAI } = await import("@google/genai");
  return new GeminiAnalysisProvider(
    options,
    new GoogleGenAI(geminiClientOptions(options)),
  );
}
export const createGeminiTestProvider = createGeminiProvider;
export class GeminiAnalysisProvider implements AnalysisProvider {
  constructor(
    private readonly options: GeminiTestOptions,
    private readonly client: GeminiClient,
  ) {}
  async analyze(
    content: AnalysisContent,
    rubric: AnalysisRubric,
    model: string,
  ) {
    if (model !== this.options.model)
      throw new AnalysisProviderError("MODEL_MISMATCH");
    const systemInstruction = `${analysisInstructions}\nPrompt version: ${promptVersion}\nRubric: ${JSON.stringify(rubric)}`;
    const responseJsonSchema = z.toJSONSchema(analysisResponseSchema);
    if (
      Buffer.byteLength(
        JSON.stringify({ content, systemInstruction, responseJsonSchema }),
      ) +
        (this.options.strictUsage ? 4096 : 0) >
      (this.options.maxInputTokens ?? 64000)
    )
      throw new AnalysisProviderError("INPUT_LIMIT");
    const controller = new AbortController();
    const started = performance.now();
    const fields = {
      model,
      sdkVersion,
      timeoutMs: this.options.timeoutMs,
      maxOutputTokens: this.options.maxOutputTokens,
      thinkingLevel: "LOW" as const,
    };
    const configuration = {
      ...fields,
      fingerprint: createHash("sha256")
        .update(JSON.stringify(fields))
        .digest("hex"),
    };
    const diagnostic = (base: ProviderDiagnostics): ProviderDiagnostics => {
      const safe = providerDiagnosticsSchema.safeParse({
        ...base,
        elapsedMs: Math.max(0, Math.round(performance.now() - started)),
        configuration,
      });
      return safe.success
        ? safe.data
        : { httpStatus: null, category: "MISSING_HTTP_STATUS" };
    };
    const record = (
      stage: "response" | "failure",
      details: ProviderDiagnostics,
    ) => {
      // Logging failures must never affect analysis, submission or retry behavior.
      const safe = providerDiagnosticsSchema.safeParse(details);
      if (!safe.success) return;
      try {
        console.info("Gemini request diagnostics", { stage, ...safe.data });
      } catch {
        /* optional logging */
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let response: GenerateContentResponse;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new AnalysisProviderError("OUTCOME_UNKNOWN", false, undefined, {
              httpStatus: null,
              category: "TIMEOUT",
            }),
          );
        }, this.options.timeoutMs);
      });
      response = await Promise.race([
        this.client.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(content) }] },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema,
            candidateCount: 1,
            maxOutputTokens: this.options.maxOutputTokens,
            tools: [],
            thinkingConfig: { thinkingLevel: "LOW" as ThinkingLevel },
            automaticFunctionCalling: { disable: true },
            abortSignal: controller.signal,
            httpOptions: {
              timeout: this.options.timeoutMs,
              retryOptions: { attempts: 1 },
            },
          },
        }),
        timeout,
      ]);
    } catch (error) {
      if (error instanceof AnalysisProviderError) {
        const details = diagnostic(
          error.diagnostics ?? {
            httpStatus: null,
            category: "MISSING_HTTP_STATUS",
          },
        );
        record("failure", details);
        throw new AnalysisProviderError(
          error.code,
          error.retryable,
          error.usage,
          details,
        );
      }
      const diagnostics = diagnostic(safeHttpDiagnostics(error));
      record("failure", diagnostics);
      const status = diagnostics.httpStatus;
      if (status === 429)
        throw new AnalysisProviderError(
          "PROVIDER_RATE_LIMIT",
          true,
          undefined,
          diagnostics,
        );
      if (status !== null && [400, 401, 403, 404].includes(status))
        throw new AnalysisProviderError(
          "PROVIDER_CONFIGURATION",
          false,
          undefined,
          diagnostics,
        );
      // A timeout/5xx/connection loss may follow a completed request; never blindly retry it.
      throw new AnalysisProviderError(
        "OUTCOME_UNKNOWN",
        false,
        undefined,
        diagnostics,
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
    // A response arrived; validation/scoring below remain exactly as before.
    record(
      "response",
      diagnostic({ httpStatus: null, category: "RESPONSE_RECEIVED" }),
    );
    let usage: AnalysisUsage | undefined;
    const metadata = usageSchema.safeParse(response.usageMetadata);
    if (metadata.success) {
      const m = metadata.data;
      usage = {
        requestId: response.responseId?.slice(0, 200) ?? null,
        inputTokens: m.promptTokenCount,
        outputTokens:
          (m.candidatesTokenCount ?? 0) + (m.thoughtsTokenCount ?? 0),
        thoughtTokens: m.thoughtsTokenCount ?? 0,
        cachedInputTokens: m.cachedContentTokenCount ?? 0,
        ...(m.totalTokenCount === undefined
          ? {}
          : { totalTokens: m.totalTokenCount }),
        ...(response.modelVersion
          ? { modelVersion: response.modelVersion.slice(0, 120) }
          : {}),
      };
    }
    const reject = (code: string): never => {
      throw new AnalysisProviderError(code, false, usage);
    };
    if (this.options.strictUsage) {
      const m = metadata.success ? metadata.data : undefined;
      if (
        !m ||
        m.candidatesTokenCount === undefined ||
        m.totalTokenCount === undefined ||
        m.totalTokenCount !==
          m.promptTokenCount +
            m.candidatesTokenCount +
            (m.thoughtsTokenCount ?? 0) ||
        (m.cachedContentTokenCount ?? 0) > m.promptTokenCount ||
        !response.modelVersion ||
        response.modelVersion !== model
      ) {
        throw new AnalysisProviderError("USAGE_UNVERIFIED");
      }
      if (
        m.promptTokenCount > (this.options.maxInputTokens ?? 64000) ||
        m.candidatesTokenCount + (m.thoughtsTokenCount ?? 0) >
          this.options.maxOutputTokens
      ) {
        throw new AnalysisProviderError("USAGE_UNVERIFIED");
      }
    }
    if (
      response.promptFeedback?.blockReason &&
      response.promptFeedback.blockReason !== "BLOCKED_REASON_UNSPECIFIED"
    )
      reject("PROVIDER_BLOCKED");
    if (response.candidates?.length !== 1) reject("INVALID_RESPONSE");
    const candidate = response.candidates![0]!;
    if (candidate.finishReason !== "STOP")
      reject(
        candidate.finishReason === "MAX_TOKENS"
          ? "OUTPUT_TRUNCATED"
          : "PROVIDER_BLOCKED",
      );
    const parts = candidate.content?.parts ?? [];
    if (
      parts.some(
        (part) =>
          part.functionCall ||
          part.executableCode ||
          part.codeExecutionResult ||
          part.inlineData,
      )
    )
      reject("INVALID_RESPONSE");
    const text = parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("");
    if (Buffer.byteLength(text) > 128000 || !usage) reject("INVALID_RESPONSE");
    try {
      const parsed: unknown = JSON.parse(text);
      // Validate without returning the computed score as a provider field; the service also validates.
      validateAnalysis(parsed, content, rubric);
      return { value: parsed, usage: usage! };
    } catch {
      return reject("INVALID_RESPONSE");
    }
  }
}
