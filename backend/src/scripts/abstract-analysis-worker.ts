import { env } from "../config/env";
import { closeDatabasePool } from "../config/database";
import { createAbstractAnalysisRepository } from "../repositories/abstractAnalysis.repository";
import { createAbstractAnalysisProvider } from "../abstracts/analysisProvider.factory";
import { AbstractAnalysisService } from "../services/abstractAnalysis.service";
import { startAbstractAnalysisJob } from "../jobs/abstractAnalysis.job";

// Explicit, separately supervised worker. Never started implicitly by the API server.
async function main() {
  const config = env.abstractAi;
  if (!config) {
    console.info("Abstract AI is disabled or its configuration is incomplete.");
    return;
  }
  if (!env.databaseUrl) throw new Error("Database is required for the Abstract AI worker");
  const stop = startAbstractAnalysisJob(
    new AbstractAnalysisService(
      createAbstractAnalysisRepository(config),
      await createAbstractAnalysisProvider(config),
    ),
  );
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await stop();
    await closeDatabasePool();
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}
void main().catch(() => {
  console.error("Abstract AI worker startup failed", { code: "WORKER_STARTUP_FAILED" });
  process.exitCode = 1;
});
