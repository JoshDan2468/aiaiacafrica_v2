import type { DelegatePaymentService } from "../services/delegatePayment.service";

const RECONCILIATION_INTERVAL_MS = 5 * 60_000;
const RECONCILIATION_BATCH_SIZE = 25;

/** Verify older unresolved attempts even when the attendee never returns from checkout. */
export function startPaymentReconciliationJob(
  service: Pick<DelegatePaymentService, "reconcile">,
  intervalMs = RECONCILIATION_INTERVAL_MS,
): () => void {
  let stopped = false;
  let running = false;

  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await service.reconcile(RECONCILIATION_BATCH_SIZE, "SYSTEM");
    } catch (error) {
      console.error("Automatic payment reconciliation failed", {
        errorType:
          error instanceof Error ? error.name : "UnknownReconciliationError",
      });
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
