import { AsyncLocalStorage } from "node:async_hooks";

type Reporter = (error: unknown, stage: string, paymentReference?: string) => void;
const operationReporter = new AsyncLocalStorage<Reporter>();

export function runWithAuditReporter<T>(reporter: Reporter, operation: () => T): T {
  return operationReporter.run(reporter, operation);
}

export function reportRecoveredPaymentError(
  error: unknown,
  stage: string,
  paymentReference: string,
): void {
  operationReporter.getStore()?.(error, stage, paymentReference);
}
