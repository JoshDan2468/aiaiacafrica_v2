import {
  readEvaluationConfig,
  readEvaluationSelection,
  runGeminiEvaluation,
} from "../abstracts/geminiSyntheticEvaluation";

// Intentionally no dotenv/env.ts/database/application imports and no implicit execution on import.
export async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    if (args.includes("--dry-run")) {
      const selection = readEvaluationSelection(args);
      console.info(
        "Synthetic Gemini dry run",
        JSON.stringify({
          run: selection.run,
          caseIds: selection.caseIds,
          caseCount: selection.caseIds.length,
          externalRequests: 0,
          journalCreated: false,
        }),
      );
      return;
    }
    const config = readEvaluationConfig(process.env, args);
    const report = await runGeminiEvaluation(config);
    console.info("Synthetic Gemini evaluation finished", {
      status: report.status,
      attempts: report.usage.dispatchedAttempts,
    });
    if (report.status !== "COMPLETED") process.exitCode = 1;
  } catch {
    // SDK/configuration exceptions may contain credentials or request bodies: never print them.
    console.error(
      "Synthetic Gemini evaluation stopped. Check test-only configuration, opt-in, arguments and run journal.",
    );
    process.exitCode = 1;
  }
}
if (require.main === module) void main();
