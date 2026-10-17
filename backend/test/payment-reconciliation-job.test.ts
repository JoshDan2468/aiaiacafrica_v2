import assert from "node:assert/strict";
import test from "node:test";
import { startPaymentReconciliationJob } from "../src/jobs/paymentReconciliation.job";

test("automatic reconciliation starts, prevents overlap, and stops cleanly", async () => {
  let calls = 0;
  let finishFirst: (() => void) | undefined;
  const firstCall = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  const stop = startPaymentReconciliationJob(
    {
      async reconcile(limit, initiatedBy) {
        assert.equal(limit, 25);
        assert.equal(initiatedBy, "SYSTEM");
        calls += 1;
        if (calls === 1) await firstCall;
        return {
          examined: 0,
          authoritative: 0,
          duplicateSuccess: 0,
          unresolved: 0,
          providerErrors: 0,
        };
      },
    },
    10,
  );

  try {
    assert.equal(calls, 1);
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(calls, 1);
    finishFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.ok(calls > 1);
  } finally {
    stop();
    finishFirst?.();
  }
  const stoppedCalls = calls;
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(calls, stoppedCalls);
});
