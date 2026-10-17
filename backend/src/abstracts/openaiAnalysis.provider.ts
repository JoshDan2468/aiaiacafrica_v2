import { z } from "zod";
import {
  analysisResponseSchema,
  promptVersion,
  type AnalysisContent,
  type AnalysisRubric,
} from "./analysis";
import type { AbstractAiConfig } from "../config/abstractAi";
import {
  AnalysisProviderError,
  analysisInstructions,
  type AnalysisProvider,
} from "./analysisProvider";
// Preserve existing import paths for callers while keeping the contract provider-neutral.
export { AnalysisProviderError, type AnalysisProvider } from "./analysisProvider";

export class OpenAiAnalysisProvider implements AnalysisProvider {
  constructor(
    private readonly config: AbstractAiConfig,
    private readonly request: typeof fetch = fetch,
  ) {}
  async analyze(content: AnalysisContent, rubric: AnalysisRubric, model: string) {
    const payload = JSON.stringify({
      model,
      store: false,
      max_output_tokens: this.config.maxOutputTokens,
      input: [
        {
          role: "system",
          content: `${analysisInstructions}\nPrompt version: ${promptVersion}\nRubric: ${JSON.stringify(rubric)}`,
        },
        { role: "user", content: JSON.stringify(content) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "abstract_advisory_analysis",
          strict: true,
          schema: z.toJSONSchema(analysisResponseSchema),
        },
      },
    });
    if (Buffer.byteLength(payload, "utf8") > this.config.maxInputTokens)
      throw new AnalysisProviderError("INPUT_LIMIT");
    let response: Response;
    try {
      response = await this.request("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: payload,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch {
      throw new AnalysisProviderError("OUTCOME_UNKNOWN");
    }
    // Never log provider bodies: they can echo confidential input.
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) throw new AnalysisProviderError("PROVIDER_RATE_LIMIT", true);
      if (response.status >= 500) throw new AnalysisProviderError("PROVIDER_UNAVAILABLE", true);
      throw new AnalysisProviderError("PROVIDER_CONFIGURATION");
    }
    let body = "";
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("EmptyResponse");
      const decoder = new TextDecoder();
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 128000) {
          await reader.cancel();
          throw new Error("ResponseTooLarge");
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
      const parsed = z
        .object({
          id: z.string().max(200),
          status: z.literal("completed"),
          output: z.array(
            z.object({
              type: z.string(),
              content: z
                .array(z.object({ type: z.string(), text: z.string().optional() }))
                .optional(),
            }),
          ),
          usage: z.object({
            input_tokens: z.number().int().nonnegative(),
            output_tokens: z.number().int().nonnegative(),
          }),
        })
        .parse(JSON.parse(body));
      const parts = parsed.output
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? []);
      if (parts.some((item) => item.type === "refusal"))
        throw new AnalysisProviderError("PROVIDER_REFUSAL");
      const texts = parts.filter((item) => item.type === "output_text");
      if (texts.length !== 1 || !texts[0]?.text) throw new Error("MissingStructuredOutput");
      return {
        value: JSON.parse(texts[0].text) as unknown,
        usage: {
          requestId: parsed.id,
          inputTokens: parsed.usage.input_tokens,
          outputTokens: parsed.usage.output_tokens,
        },
      };
    } catch (error) {
      if (error instanceof AnalysisProviderError) throw error;
      throw new AnalysisProviderError("INVALID_RESPONSE");
    }
  }
}
