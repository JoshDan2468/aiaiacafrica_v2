import type { AbstractAiConfig } from "../config/abstractAi";
import { geminiPricingIsCurrent } from "../config/abstractAi";
import { AnalysisProviderError, type AnalysisProvider } from "./analysisProvider";
import { OpenAiAnalysisProvider } from "./openaiAnalysis.provider";
import {
  createGeminiProvider,
  GeminiAnalysisProvider,
  type GeminiClient,
} from "./geminiAnalysis.provider";

/** Shared worker factory. Test dependencies replace transports; never read synthetic credentials. */
export async function createAbstractAnalysisProvider(
  config: AbstractAiConfig,
  dependencies: {
    geminiClient?: GeminiClient;
    openaiRequest?: typeof fetch;
  } = {},
): Promise<AnalysisProvider> {
  if (config.provider === "openai")
    return new OpenAiAnalysisProvider(config, dependencies.openaiRequest);
  if (config.provider !== "gemini" || !geminiPricingIsCurrent(config))
    throw new AnalysisProviderError("PROVIDER_CONFIGURATION");
  const options = {
    apiKey: config.apiKey,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
    maxInputTokens: config.maxInputTokens,
    strictUsage: true,
  };
  const provider = dependencies.geminiClient
    ? new GeminiAnalysisProvider(options, dependencies.geminiClient)
    : await createGeminiProvider(options);
  return {
    async analyze(content, rubric, model) {
      if (!geminiPricingIsCurrent(config))
        throw new AnalysisProviderError("PROVIDER_CONFIGURATION");
      return provider.analyze(content, rubric, model);
    },
  };
}
