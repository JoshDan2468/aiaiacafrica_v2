import type { AbstractAnalysisService } from "../services/abstractAnalysis.service";

/** No provider request runs in an HTTP handler. PostgreSQL enforces cross-process claims. */
export function startAbstractAnalysisJob(service: AbstractAnalysisService): () => Promise<void> {
  let stopped = false;
  let pending: Promise<void> | null = null;
  const tick = () => {
    if (stopped || pending) return;
    pending = service
      .runOne()
      .then(() => {})
      .catch(() => {
        console.error("Abstract AI worker unavailable", { code: "WORKER_UNAVAILABLE" });
      })
      .finally(() => {
        pending = null;
      });
  };
  const timer = setInterval(tick, 5000);
  tick();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await pending;
  };
}
