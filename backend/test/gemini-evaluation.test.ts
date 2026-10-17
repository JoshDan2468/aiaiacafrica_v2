import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import type { GenerateContentResponse } from "@google/genai" with {
  "resolution-mode": "import",
};
import {
  GeminiAnalysisProvider,
  geminiClientOptions,
  type GeminiClient,
  type GeminiTestOptions,
} from "../src/abstracts/geminiAnalysis.provider";
import {
  AnalysisProviderError,
  analysisInstructions,
} from "../src/abstracts/analysisProvider";
import { AnalysisProviderError as LegacyError } from "../src/abstracts/openaiAnalysis.provider";
import { draftRubric, validateAnalysis } from "../src/abstracts/analysis";
import {
  loadSyntheticCorpus,
  readEvaluationConfig,
  readEvaluationSelection,
  runGeminiEvaluation,
  type EvaluationConfig,
} from "../src/abstracts/geminiSyntheticEvaluation";

const corpus = loadSyntheticCorpus();
const content = {
  title: corpus[0]!.title,
  abstractBody: corpus[0]!.abstractBody,
  keywords: corpus[0]!.keywords,
};
const criterion = {
  score: 3,
  explanation: "Synthetic test assessment.",
  evidence: content.abstractBody.split(". ")[0]!,
};
const valid = {
  summary: "Synthetic forecasting study.",
  categories: [
    {
      category: "Artificial Intelligence",
      explanation: "The abstract describes machine learning.",
    },
  ],
  criteria: {
    relevance: criterion,
    clarity: criterion,
    methodology: criterion,
    contribution: criterion,
    completeness: criterion,
  },
  issues: ["Generated data limits generalization."],
  scoreExplanation:
    "Synthetic reference scores, not measured model performance.",
};
const options: GeminiTestOptions = {
  apiKey: "dummy-secret-never-a-real-key",
  model: "gemini-3.8-flash",
  timeoutMs: 100,
  maxOutputTokens: 4096,
};
const env = {
  NODE_ENV: "test",
  GEMINI_TEST_ALLOW_EXTERNAL: "true",
  GEMINI_TEST_FREE_TIER_CONFIRMED: "true",
  GEMINI_API_KEY_TEST: options.apiKey,
  GEMINI_MODEL_TEST: options.model,
};
const args = ["--execute", "--run", "mock", "--case", "S01"];
function response(value: unknown = valid): GenerateContentResponse {
  return {
    responseId: "synthetic-id",
    modelVersion: "synthetic-version",
    candidates: [
      {
        finishReason: "STOP",
        content: { role: "model", parts: [{ text: JSON.stringify(value) }] },
      },
    ],
    usageMetadata: {
      promptTokenCount: 2000,
      candidatesTokenCount: 800,
      thoughtsTokenCount: 100,
      totalTokenCount: 2900,
      cachedContentTokenCount: 50,
    },
  } as GenerateContentResponse;
}
function client(work: GeminiClient["models"]["generateContent"]): GeminiClient {
  return { models: { generateContent: work } };
}
function directory() {
  const root = resolve(__dirname, "../../output/gemini-evaluation");
  mkdirSync(root, { recursive: true });
  return mkdtempSync(resolve(root, "mocked-"));
}
test("shared contract preserves OpenAI error identity and advisory instructions", () => {
  assert.equal(AnalysisProviderError, LegacyError);
  assert.match(analysisInstructions, /Do not accept\/reject/);
});
test("external execution requires opt-in, test mode, test key, exact verified model and explicit case selection", () => {
  assert.equal(readEvaluationConfig(env, args).maxAttempts, 1);
  assert.equal(
    readEvaluationConfig(env, ["--execute", "--run", "all", "--all"]).caseIds
      .length,
    20,
  );
  for (const overrides of [
    { NODE_ENV: "production" },
    { NODE_ENV: "development" },
    { GEMINI_TEST_ALLOW_EXTERNAL: "false" },
    { GEMINI_TEST_FREE_TIER_CONFIRMED: "false" },
    { GEMINI_API_KEY_TEST: "" },
    { GEMINI_MODEL_TEST: "gemini-flash-latest" },
    { GEMINI_TEST_MAX_ATTEMPTS: "3" },
  ])
    assert.throws(() => readEvaluationConfig({ ...env, ...overrides }, args));
  for (const invalid of [
    args.filter((item) => item !== "--execute"),
    [...args, "--all"],
    [...args, "--input", "live.json"],
    ["--execute", "--run", "../escape", "--case", "S01"],
    ["--execute", "--run", "mock", "--case", "S21"],
  ])
    assert.throws(() => readEvaluationConfig(env, invalid));
  assert.throws(() =>
    readEvaluationConfig(
      {
        ...env,
        GEMINI_API_KEY_TEST: undefined,
        GOOGLE_API_KEY: "production-value",
        GEMINI_API_KEY: "production-value",
      },
      args,
    ),
  );
});
test("SDK options disable hidden retries, endpoint overrides and implicit enterprise credentials", () => {
  const config = geminiClientOptions(options);
  assert.equal(config.apiKey, options.apiKey);
  assert.equal(config.vertexai, false);
  assert.equal(config.enterprise, false);
  assert.equal(config.httpOptions?.retryOptions?.attempts, 1);
  assert.equal(
    config.httpOptions?.baseUrl,
    "https://generativelanguage.googleapis.com",
  );
});
test("Gemini success requests structured JSON, no tools, shared prompt and reports thinking tokens", async () => {
  let calls = 0;
  const provider = new GeminiAnalysisProvider(
    options,
    client(async (request) => {
      calls++;
      assert.equal(request.model, options.model);
      assert.equal(request.config?.responseMimeType, "application/json");
      assert.ok(request.config?.responseJsonSchema);
      assert.deepEqual(request.config?.tools, []);
      assert.match(
        String(request.config?.systemInstruction),
        /untrusted research data/,
      );
      assert.equal(request.config?.httpOptions?.retryOptions?.attempts, 1);
      return response();
    }),
  );
  const result = await provider.analyze(content, draftRubric, options.model);
  assert.equal(calls, 1);
  assert.equal(result.usage.outputTokens, 900);
  assert.equal(result.usage.thoughtTokens, 100);
  assert.equal(
    validateAnalysis(result.value, content, draftRubric).advisoryScore,
    75,
  );
  assert.equal("advisoryScore" in (result.value as object), false);
});
for (const [name, payload, code] of [
  [
    "prompt blocked",
    {
      ...response(),
      promptFeedback: { blockReason: "SAFETY" },
      candidates: [],
    },
    "PROVIDER_BLOCKED",
  ],
  [
    "candidate blocked",
    { ...response(), candidates: [{ finishReason: "SAFETY" }] },
    "PROVIDER_BLOCKED",
  ],
  [
    "truncated",
    { ...response(), candidates: [{ finishReason: "MAX_TOKENS" }] },
    "OUTPUT_TRUNCATED",
  ],
  [
    "invalid administrative field",
    response({ ...valid, status: "ACCEPTED" }),
    "INVALID_RESPONSE",
  ],
  [
    "invalid evidence",
    response({
      ...valid,
      criteria: {
        ...valid.criteria,
        relevance: { ...criterion, evidence: "An invented finding" },
      },
    }),
    "INVALID_RESPONSE",
  ],
  [
    "missing usage",
    { ...response(), usageMetadata: undefined },
    "INVALID_RESPONSE",
  ],
  [
    "malformed JSON",
    {
      ...response(),
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } },
      ],
    },
    "INVALID_RESPONSE",
  ],
  [
    "function call",
    {
      ...response(),
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ functionCall: { name: "acceptAbstract" } }] },
        },
      ],
    },
    "INVALID_RESPONSE",
  ],
] as const)
  test(`Gemini handles ${name} without publishing a result or raw exception`, async () => {
    await assert.rejects(
      () =>
        new GeminiAnalysisProvider(
          options,
          client(async () => payload as GenerateContentResponse),
        ).analyze(content, draftRubric, options.model),
      (error) =>
        error instanceof AnalysisProviderError &&
        error.code === code &&
        !error.message.includes(options.apiKey),
    );
  });
test("quota errors are bounded retry candidates; server errors and transport failures are uncertain", async () => {
  for (const status of [429, 401, 404, 503, 0]) {
    let calls = 0;
    const provider = new GeminiAnalysisProvider(
      options,
      client(async () => {
        calls++;
        throw { status, message: options.apiKey };
      }),
    );
    await assert.rejects(
      () => provider.analyze(content, draftRubric, options.model),
      (error) =>
        error instanceof AnalysisProviderError &&
        error.code ===
          (status === 429
            ? "PROVIDER_RATE_LIMIT"
            : [401, 404].includes(status)
              ? "PROVIDER_CONFIGURATION"
              : "OUTCOME_UNKNOWN") &&
        error.retryable === (status === 429),
    );
    assert.equal(calls, 1);
  }
});
test("bounded timeout aborts and remains uncertain without retry", async () => {
  let calls = 0;
  let signal: AbortSignal | undefined;
  const provider = new GeminiAnalysisProvider(
    { ...options, timeoutMs: 5 },
    client(async (request) => {
      calls++;
      signal = request.config?.abortSignal;
      return new Promise(() => {});
    }),
  );
  await assert.rejects(
    () => provider.analyze(content, draftRubric, options.model),
    /OUTCOME_UNKNOWN/,
  );
  assert.equal(calls, 1);
  assert.equal(signal?.aborted, true);
});
test("the actual SDK sends only one mocked HTTP request on a quota response", async () => {
  const { GoogleGenAI } = await import("@google/genai");
  let calls = 0;
  const config = geminiClientOptions(options);
  const sdk = new GoogleGenAI({
    ...config,
    httpOptions: {
      ...config.httpOptions,
      fetch: (async () => {
        calls++;
        return new Response(
          JSON.stringify({ error: { code: 429, message: "Synthetic quota" } }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }) as NonNullable<NonNullable<typeof config.httpOptions>["fetch"]>,
    },
  });
  await assert.rejects(
    () =>
      new GeminiAnalysisProvider(options, sdk).analyze(
        content,
        draftRubric,
        options.model,
      ),
    /PROVIDER_RATE_LIMIT/,
  );
  assert.equal(calls, 1);
});
test("runner journals results, removes credentials and does not rerun an existing case", async () => {
  const root = directory();
  let calls = 0;
  const config = readEvaluationConfig(env, args);
  const deps = {
    outputRoot: root,
    providerFactory: async () => ({
      async analyze() {
        calls++;
        return {
          value: { ...valid, summary: `Synthetic text ${options.apiKey}` },
          usage: { requestId: "test", inputTokens: 20, outputTokens: 10 },
        };
      },
    }),
  };
  const report = await runGeminiEvaluation(config, deps);
  assert.equal(report.status, "COMPLETED");
  assert.equal(report.cases[0]?.comparison?.categoriesMatch, true);
  assert.equal(
    report.cases[0]?.comparison?.narrativeReview,
    "REQUIRES_HUMAN_REVIEW",
  );
  const saved = readFileSync(resolve(root, "mock/results.json"), "utf8");
  assert.equal(saved.includes(options.apiKey), false);
  assert.match(saved, /REDACTED/);
  await runGeminiEvaluation(config, deps);
  assert.equal(calls, 1);
});
test("runner quota retry uses at least 60 seconds and respects the shared attempt cap", async () => {
  let calls = 0;
  const delays: number[] = [];
  const config = readEvaluationConfig(
    { ...env, GEMINI_TEST_MAX_ATTEMPTS: "2" },
    args,
  );
  const report = await runGeminiEvaluation(config, {
    outputRoot: directory(),
    wait: async (ms) => {
      delays.push(ms);
    },
    providerFactory: async () => ({
      async analyze() {
        calls++;
        throw new AnalysisProviderError("PROVIDER_RATE_LIMIT", true);
      },
    }),
  });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [60000]);
  assert.equal(report.status, "HALTED");
  assert.equal(report.usage.unknownUsageAttempts, 2);
});
test("runner never retries uncertain outcomes and will not dispatch other cases afterward", async () => {
  let calls = 0;
  const config = readEvaluationConfig(env, [
    "--execute",
    "--run",
    "uncertain",
    "--all",
  ]);
  const deps = {
    outputRoot: directory(),
    wait: async () => {},
    providerFactory: async () => ({
      async analyze() {
        calls++;
        throw new AnalysisProviderError("OUTCOME_UNKNOWN");
      },
    }),
  };
  const report = await runGeminiEvaluation(config, deps);
  assert.equal(report.status, "HALTED");
  assert.equal(calls, 1);
  await runGeminiEvaluation(config, deps);
  assert.equal(calls, 1);
});
test("runner lock prevents overlapping processes and interrupted dispatch is not repeated", async () => {
  const root = directory();
  const config: EvaluationConfig = readEvaluationConfig(env, args);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const work = runGeminiEvaluation(config, {
    outputRoot: root,
    providerFactory: async () => {
      await held;
      throw new Error("Synthetic factory failure");
    },
  });
  // First execution writes the initial journal and holds the exclusive run lock before its factory resolves.
  await assert.rejects(
    () => runGeminiEvaluation(config, { outputRoot: root }),
    /RUN_LOCKED/,
  );
  const rejected = assert.rejects(work, /Synthetic factory failure/);
  release();
  await rejected;
  const reportPath = resolve(root, "mock/results.json");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const interruptedRoot = directory();
  mkdirSync(resolve(interruptedRoot, "mock"));
  report.cases[0].attempts = [
    {
      status: "DISPATCHED",
      dispatchedAt: new Date().toISOString(),
      usage: null,
    },
  ];
  report.status = "RUNNING";
  writeFileSync(
    resolve(interruptedRoot, "mock/results.json"),
    JSON.stringify(report),
  );
  let factories = 0;
  const resumed = await runGeminiEvaluation(config, {
    outputRoot: interruptedRoot,
    providerFactory: async () => {
      factories++;
      throw new Error("must not construct client");
    },
  });
  assert.equal(resumed.status, "HALTED_UNCERTAIN");
  assert.equal(factories, 0);
});

test("all 20 pinned synthetic cases complete sequentially with expected comparisons", async () => {
  let calls = 0;
  let active = 0;
  const config = readEvaluationConfig(env, [
    "--execute",
    "--run",
    "all-mocked",
    "--all",
  ]);
  const report = await runGeminiEvaluation(config, {
    outputRoot: directory(),
    wait: async () => {},
    providerFactory: async () => ({
      async analyze() {
        assert.equal(active++, 0);
        calls++;
        await Promise.resolve();
        active--;
        const scores = Object.fromEntries(
          Object.keys(valid.criteria).map((key) => [
            key,
            { ...criterion, evidence: null },
          ]),
        );
        return {
          value: { ...valid, criteria: scores },
          usage: {
            requestId: "mock-only",
            inputTokens: 2000,
            outputTokens: 900,
          },
        };
      },
    }),
  });
  assert.equal(calls, 20);
  assert.equal(report.status, "COMPLETED");
  assert.equal(report.cases.length, 20);
  assert.equal(report.usage.dispatchedAttempts, 20);
  assert.equal(report.usage.knownInputTokens, 40000);
  for (const entry of report.cases) {
    assert.equal(entry.attempts.length, 1);
    assert.ok(entry.comparison?.expected);
    assert.equal(
      entry.comparison?.consistencyReview,
      "NOT_MEASURED_SINGLE_RUN",
    );
    assert.equal("status" in entry.result!, false);
  }
});

test("actual SDK serializes structured JSON request through mocked transport", async () => {
  const { GoogleGenAI } = await import("@google/genai");
  let calls = 0;
  const config = geminiClientOptions(options);
  const sdk = new GoogleGenAI({
    ...config,
    httpOptions: {
      ...config.httpOptions,
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        calls++;
        assert.match(String(url), /generativelanguage.googleapis.com/);
        assert.match(String(url), /models\/gemini-3\.8-flash:generateContent/);
        const body = JSON.parse(String(init?.body));
        assert.equal(
          body.generationConfig.responseMimeType,
          "application/json",
        );
        assert.ok(body.generationConfig.responseJsonSchema);
        assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, "LOW");
        assert.equal(body.contents[0].parts[0].text, JSON.stringify(content));
        return new Response(JSON.stringify(response()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as NonNullable<NonNullable<typeof config.httpOptions>["fetch"]>,
    },
  });
  const result = await new GeminiAnalysisProvider(options, sdk).analyze(
    content,
    draftRubric,
    options.model,
  );
  assert.equal(calls, 1);
  assert.equal(result.usage.inputTokens, 2000);
});

const diagnosticStatuses = [
  [400, "BAD_REQUEST"],
  [401, "UNAUTHENTICATED"],
  [403, "PERMISSION_DENIED"],
  [404, "NOT_FOUND"],
  [408, "HTTP_ERROR"],
  [418, "HTTP_ERROR"],
  [429, "RATE_LIMITED"],
  [500, "SERVER_ERROR"],
  [502, "SERVER_ERROR"],
  [503, "SERVER_ERROR"],
  [504, "SERVER_ERROR"],
] as const;
for (const [status, category] of diagnosticStatuses) {
  test(`HTTP ${status} journals only safe diagnostics and preserves failure policy`, async () => {
    let calls = 0;
    const root = directory();
    const config = readEvaluationConfig(
      { ...env, GEMINI_TEST_MAX_ATTEMPTS: status === 429 ? "1" : "2" },
      args,
    );
    const provider = new GeminiAnalysisProvider(
      options,
      client(async () => {
        calls++;
        throw {
          status,
          message: `raw-provider-marker ${options.apiKey} ${content.abstractBody}`,
          headers: { Authorization: options.apiKey },
          response: { confidential: content.title },
        };
      }),
    );
    const deps = { outputRoot: root, providerFactory: async () => provider };
    const report = await runGeminiEvaluation(config, deps);
    const attempt = report.cases[0]!.attempts[0]!;
    assert.equal(attempt.diagnostics?.httpStatus, status);
    assert.equal(attempt.diagnostics?.category, category);
    assert.ok(attempt.diagnostics?.elapsedMs !== undefined);
    assert.equal(attempt.diagnostics?.configuration?.model, options.model);
    assert.equal(
      attempt.diagnostics?.configuration?.timeoutMs,
      options.timeoutMs,
    );
    assert.equal(
      attempt.diagnostics?.configuration?.maxOutputTokens,
      options.maxOutputTokens,
    );
    assert.equal(attempt.diagnostics?.configuration?.thinkingLevel, "LOW");
    assert.match(
      attempt.diagnostics?.configuration?.fingerprint ?? "",
      /^[a-f0-9]{64}$/,
    );
    assert.match(
      attempt.diagnostics?.configuration?.sdkVersion ?? "",
      /^\d+\.\d+\.\d+/,
    );
    assert.equal(
      attempt.status,
      status === 429
        ? "PROVIDER_RATE_LIMIT"
        : [400, 401, 403, 404].includes(status)
          ? "PROVIDER_CONFIGURATION"
          : "OUTCOME_UNKNOWN",
    );
    assert.equal(report.status, "HALTED");
    assert.equal(calls, 1);
    assert.equal(report.cases[0]!.result, null);
    await runGeminiEvaluation(config, deps);
    assert.equal(calls, 1);
    const saved = readFileSync(resolve(root, "mock/results.json"), "utf8");
    for (const secret of [
      options.apiKey,
      content.abstractBody,
      content.title,
      "raw-provider-marker",
      "Authorization",
      "confidential",
    ]) {
      assert.equal(saved.includes(secret), false);
    }
  });
}

const unexpectedErrors: Array<[string, unknown, string]> = [
  [
    "SDK timeout",
    Object.assign(new Error("do not persist"), { name: "RequestTimeoutError" }),
    "SDK_TIMEOUT",
  ],
  [
    "SDK connection timeout",
    { name: "APIConnectionTimeoutError" },
    "SDK_TIMEOUT",
  ],
  [
    "nested SDK timeout",
    { name: "TypeError", cause: { code: "UND_ERR_CONNECT_TIMEOUT" } },
    "SDK_TIMEOUT",
  ],
  [
    "network failure",
    { name: "TypeError", code: "ECONNRESET" },
    "TRANSPORT_ERROR",
  ],
  ["missing", {}, "MISSING_HTTP_STATUS"],
  ["undefined", { status: undefined }, "MISSING_HTTP_STATUS"],
  ["null error", null, "MISSING_HTTP_STATUS"],
  ["string error", options.apiKey, "MISSING_HTTP_STATUS"],
  ["null status", { status: null }, "INVALID_HTTP_STATUS"],
  ["boolean", { status: true }, "INVALID_HTTP_STATUS"],
  ["zero", { status: 0 }, "INVALID_HTTP_STATUS"],
  ["success status", { status: 200 }, "INVALID_HTTP_STATUS"],
  ["outside HTTP", { status: 600 }, "INVALID_HTTP_STATUS"],
  ["fractional", { status: 401.5 }, "INVALID_HTTP_STATUS"],
  ["NaN", { status: NaN }, "INVALID_HTTP_STATUS"],
  ["infinity", { status: Infinity }, "INVALID_HTTP_STATUS"],
  ["sensitive string", { status: options.apiKey }, "INVALID_HTTP_STATUS"],
  ["array", { status: [401] }, "INVALID_HTTP_STATUS"],
  [
    "object coercion",
    {
      status: {
        valueOf() {
          throw new Error("Must not coerce");
        },
      },
    },
    "INVALID_HTTP_STATUS",
  ],
  [
    "getter",
    Object.defineProperty({}, "status", {
      get() {
        throw new Error("Must not read getter");
      },
    }),
    "INVALID_HTTP_STATUS",
  ],
];
for (const [name, failure, category] of unexpectedErrors) {
  test(`unexpected status: ${name} fails closed with sanitized journal`, async () => {
    let calls = 0;
    const config = readEvaluationConfig(
      { ...env, GEMINI_TEST_MAX_ATTEMPTS: "2" },
      args,
    );
    const report = await runGeminiEvaluation(config, {
      outputRoot: directory(),
      providerFactory: async () =>
        new GeminiAnalysisProvider(
          options,
          client(async () => {
            calls++;
            throw failure;
          }),
        ),
    });
    assert.equal(report.cases[0]!.attempts[0]!.diagnostics?.httpStatus, null);
    assert.equal(report.cases[0]!.attempts[0]!.diagnostics?.category, category);
    assert.equal(report.cases[0]!.status, "OUTCOME_UNKNOWN");
    assert.equal(report.status, "HALTED");
    assert.equal(calls, 1);
  });
}

test("numeric string HTTP status is normalized without exposing raw error", async () => {
  const provider = new GeminiAnalysisProvider(
    options,
    client(async () => {
      throw { status: "403", message: options.apiKey };
    }),
  );
  await assert.rejects(
    () => provider.analyze(content, draftRubric, options.model),
    (error) => {
      assert.ok(error instanceof AnalysisProviderError);
      assert.equal(error.diagnostics?.httpStatus, 403);
      assert.equal(error.diagnostics?.category, "PERMISSION_DENIED");
      assert.equal(error.retryable, false);
      assert.equal(error.message, "PROVIDER_CONFIGURATION");
      return true;
    },
  );
});

test("configuration fingerprint is stable across keys and safe response diagnostics are logged", async (t) => {
  const logged: unknown[][] = [];
  t.mock.method(console, "info", (...values: unknown[]) => logged.push(values));
  for (const apiKey of [options.apiKey, "another-private-key"]) {
    await new GeminiAnalysisProvider(
      { ...options, apiKey },
      client(async () => response()),
    ).analyze(content, draftRubric, options.model);
  }
  const first = logged[0]![1] as {
    configuration: { fingerprint: string };
    elapsedMs: number;
    category: string;
  };
  const second = logged[1]![1] as typeof first;
  assert.equal(
    first.configuration.fingerprint,
    second.configuration.fingerprint,
  );
  assert.equal(first.category, "RESPONSE_RECEIVED");
  assert.ok(first.elapsedMs >= 0);
  const text = JSON.stringify(logged);
  for (const secret of [
    options.apiKey,
    "another-private-key",
    content.abstractBody,
    content.title,
  ])
    assert.equal(text.includes(secret), false);
});

test("an actual HTTP 504 takes precedence over a timeout-like error name", async () => {
  await assert.rejects(
    () =>
      new GeminiAnalysisProvider(
        options,
        client(async () => {
          throw { status: 504, name: "RequestTimeoutError" };
        }),
      ).analyze(content, draftRubric, options.model),
    (error) => {
      assert.ok(error instanceof AnalysisProviderError);
      assert.equal(error.diagnostics?.category, "SERVER_ERROR");
      assert.equal(error.diagnostics?.httpStatus, 504);
      assert.equal(error.code, "OUTCOME_UNKNOWN");
      assert.equal(error.retryable, false);
      return true;
    },
  );
});

test("journal rejects unexpected diagnostic fields or free-form categories", async () => {
  for (const diagnostics of [
    { httpStatus: 401, category: "UNAUTHENTICATED", headers: options.apiKey },
    { httpStatus: 401, category: options.apiKey },
    { httpStatus: options.apiKey, category: "UNAUTHENTICATED" },
  ]) {
    const root = directory();
    const failure = new AnalysisProviderError("PROVIDER_CONFIGURATION");
    Object.assign(failure, { diagnostics });
    const report = await runGeminiEvaluation(readEvaluationConfig(env, args), {
      outputRoot: root,
      providerFactory: async () => ({
        async analyze() {
          throw failure;
        },
      }),
    });
    assert.equal(report.cases[0]!.attempts[0]!.diagnostics, undefined);
    assert.equal(
      readFileSync(resolve(root, "mock/results.json"), "utf8").includes(
        options.apiKey,
      ),
      false,
    );
  }
});

for (const status of [400, 401, 403, 404]) {
  test(`actual SDK HTTP ${status} preserves safe status without retry or response leakage`, async () => {
    const { GoogleGenAI } = await import("@google/genai");
    let calls = 0;
    const config = geminiClientOptions(options);
    const sdk = new GoogleGenAI({
      ...config,
      httpOptions: {
        ...config.httpOptions,
        fetch: (async () => {
          calls++;
          return new Response(
            JSON.stringify({
              error: {
                code: status,
                message: `${options.apiKey} ${content.abstractBody}`,
              },
            }),
            { status, headers: { "Content-Type": "application/json" } },
          );
        }) as NonNullable<NonNullable<typeof config.httpOptions>["fetch"]>,
      },
    });
    await assert.rejects(
      () =>
        new GeminiAnalysisProvider(options, sdk).analyze(
          content,
          draftRubric,
          options.model,
        ),
      (error) => {
        assert.ok(error instanceof AnalysisProviderError);
        assert.equal(error.code, "PROVIDER_CONFIGURATION");
        assert.equal(error.retryable, false);
        assert.equal(error.diagnostics?.httpStatus, status);
        assert.equal(error.message.includes(options.apiKey), false);
        assert.equal(
          JSON.stringify(error).includes(content.abstractBody),
          false,
        );
        return true;
      },
    );
    assert.equal(calls, 1);
  });
}

const remainingIds = [
  "S02",
  "S03",
  "S05",
  "S06",
  "S07",
  "S08",
  "S09",
  "S10",
  "S11",
  "S12",
  "S13",
  "S14",
  "S15",
  "S16",
  "S17",
  "S18",
  "S19",
  "S20",
];
const batchArgs = [
  "--execute",
  "--run",
  "remaining-mocked",
  "--cases",
  remainingIds.join(","),
];

test("--cases selects exactly the remaining 18 fixture IDs and preserves supplied order", () => {
  const config = readEvaluationConfig(env, batchArgs);
  assert.deepEqual(config.caseIds, remainingIds);
  assert.equal(new Set(config.caseIds).size, 18);
  assert.equal(config.caseIds.includes("S01"), false);
  assert.equal(config.caseIds.includes("S04"), false);
  assert.deepEqual(
    readEvaluationSelection([
      "--dry-run",
      "--run",
      "order",
      "--cases",
      " S20, S02,S06 ",
    ]).caseIds,
    ["S20", "S02", "S06"],
  );
});

const invalidLists = [
  "",
  " ",
  ",",
  "S02,",
  ",S02",
  "S02,,S03",
  "S02,S02",
  "S02, S02",
  "S00",
  "S21",
  "S2",
  "s02",
  "S02,UNKNOWN",
  "S02;S03",
];
for (let index = 0; index < invalidLists.length; index++) {
  test(`--cases rejects invalid or duplicate selection ${index + 1}`, () => {
    const args = [
      "--dry-run",
      "--run",
      "invalid",
      "--cases",
      invalidLists[index]!,
    ];
    assert.throws(
      () => readEvaluationSelection(args),
      /INVALID_TEST_ARGUMENTS/,
    );
    assert.throws(
      () =>
        readEvaluationConfig(
          env,
          args.map((value) => (value === "--dry-run" ? "--execute" : value)),
        ),
      /INVALID_TEST_ARGUMENTS/,
    );
  });
}

test("all selection conflicts, duplicate flags and mixed execution modes are rejected", () => {
  for (const flags of [
    ["--case", "S02", "--cases", "S03"],
    ["--cases", "S02", "--all"],
    ["--case", "S02", "--all"],
    ["--case", "S02", "--cases", "S03", "--all"],
    ["--cases", "S02", "--cases", "S03"],
    ["--cases"],
    ["--cases", "--all"],
    [],
  ])
    assert.throws(() =>
      readEvaluationSelection(["--dry-run", "--run", "conflict", ...flags]),
    );
  assert.throws(() => readEvaluationSelection(["--dry-run", ...batchArgs]));
  assert.throws(() => readEvaluationConfig(env, ["--dry-run", ...batchArgs]));
  assert.throws(
    () => readEvaluationConfig({}, batchArgs),
    /EXTERNAL_EXECUTION_NOT_APPROVED/,
  );
});

test("remaining batch dispatches each selected fixture once, sequentially, and journals order", async () => {
  const received: string[] = [];
  const delays: number[] = [];
  let active = false;
  const config = readEvaluationConfig(env, batchArgs);
  const root = directory();
  const deps = {
    outputRoot: root,
    wait: async (ms: number) => {
      delays.push(ms);
    },
    providerFactory: async () => ({
      async analyze(submitted: typeof content) {
        assert.equal(active, false);
        active = true;
        received.push(
          corpus.find((item) => item.title === submitted.title)!.id,
        );
        await Promise.resolve();
        active = false;
        return {
          value: {
            ...valid,
            criteria: Object.fromEntries(
              Object.keys(valid.criteria).map((key) => [
                key,
                { ...criterion, evidence: null },
              ]),
            ),
          },
          usage: {
            requestId: "mock-only",
            inputTokens: 100,
            outputTokens: 100,
          },
        };
      },
    }),
  };
  const report = await runGeminiEvaluation(config, deps);
  assert.deepEqual(received, remainingIds);
  assert.equal(report.usage.dispatchedAttempts, 18);
  assert.deepEqual(
    report.cases.map((item) => item.id),
    remainingIds,
  );
  assert.ok(report.cases.every((item) => item.attempts.length === 1));
  assert.deepEqual(delays, Array(17).fill(config.intervalMs));
  await runGeminiEvaluation(config, deps);
  assert.equal(received.length, 18);
  const reordered = { ...config, caseIds: [...config.caseIds].reverse() };
  await assert.rejects(
    () => runGeminiEvaluation(reordered, deps),
    /RUN_CONFIGURATION_CHANGED/,
  );
});

test("dry-run CLI needs no credentials, makes no journal and never enters execution mode", () => {
  const run = "selection-dry-run-test";
  const runPath = resolve(
    __dirname,
    "../../output/gemini-evaluation/runs",
    run,
  );
  assert.equal(existsSync(runPath), false);
  const result = spawnSync(
    process.execPath,
    [
      resolve(__dirname, "../node_modules/tsx/dist/cli.mjs"),
      resolve(__dirname, "../src/scripts/evaluate-gemini-synthetic.ts"),
      "--dry-run",
      "--run",
      run,
      "--cases",
      remainingIds.join(","),
    ],
    {
      encoding: "utf8",
      timeout: 15000,
      env: {
        ...process.env,
        NODE_ENV: "production",
        GEMINI_API_KEY_TEST: undefined,
        GEMINI_MODEL_TEST: undefined,
        GEMINI_TEST_ALLOW_EXTERNAL: "false",
        GEMINI_TEST_FREE_TIER_CONFIRMED: "false",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const preview = JSON.parse(
    result.stdout.trim().replace(/^Synthetic Gemini dry run /, ""),
  );
  assert.deepEqual(preview.caseIds, remainingIds);
  assert.equal(preview.caseCount, 18);
  assert.equal(preview.externalRequests, 0);
  assert.equal(preview.journalCreated, false);
  assert.equal(existsSync(runPath), false);
});
