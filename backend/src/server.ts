import { startCommunicationJob } from "./jobs/communication.job";
import type { CommunicationService } from "./services/communication.service";
import { createServer } from "node:http";
import { createConfiguredApplication } from "./app";
import { closeDatabasePool } from "./config/database";
import { env } from "./config/env";
import { startPaymentReconciliationJob } from "./jobs/paymentReconciliation.job";
import { flushRequestAuditLog } from "./middleware/requestLogger.middleware";
import type { DelegatePaymentService } from "./services/delegatePayment.service";
import { prepareProductionStudentEvidenceProviders } from "./studentEvidence/providers";

// Process entry point: assemble the configured Express app and expose it through an HTTP server.
let communicationService: CommunicationService | undefined;
let stopCommunications: (() => void) | undefined;
let paymentService: DelegatePaymentService | undefined;
let server: ReturnType<typeof createServer> | undefined;
let shuttingDown = false;
let stopPaymentReconciliation: (() => void) | undefined;

async function start(): Promise<void> {
  const studentEvidenceProviders =
    env.studentEvidenceEnabled && env.studentEvidenceClamdSocket
      ? await prepareProductionStudentEvidenceProviders(
          env.studentEvidenceStorageDirectory,
          env.studentEvidenceClamdSocket,
        )
      : undefined;
  server = createServer(
    createConfiguredApplication({
      ...(studentEvidenceProviders ? { studentEvidenceProviders } : {}),
      onCommunicationServiceCreated(service) {
        communicationService = service;
      },
      onPaymentServiceCreated(service) {
        paymentService = service;
      },
    }),
  );
  server.listen(env.port, () => {
    console.info(`AIAIAC API listening on port ${env.port}`);
    if (env.communicationsBulkSendEnabled && communicationService)
      stopCommunications = startCommunicationJob(communicationService);
    if ((env.paystack || env.flutterwave) && paymentService) {
      stopPaymentReconciliation = startPaymentReconciliationJob(paymentService);
    }
  });
}

void start().catch((error: unknown) => {
  console.error("AIAIAC API startup failed", {
    errorType: error instanceof Error ? error.name : "UnknownStartupError",
  });
  process.exitCode = 1;
});

async function shutdown(signal: string): Promise<void> {
  // Stop accepting requests, then close PostgreSQL so deployments and Ctrl+C exit cleanly.
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; shutting down AIAIAC API`);
  stopPaymentReconciliation?.();
  stopCommunications?.();

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  if (!server) {
    await closeDatabasePool();
    await flushRequestAuditLog();
    clearTimeout(forceExitTimer);
    process.exit();
  }
  server.close(async (serverError) => {
    try {
      await closeDatabasePool();
    } catch {
      console.error("Database pool did not close cleanly");
      process.exitCode = 1;
    }

    if (serverError) {
      console.error("HTTP server did not close cleanly");
      process.exitCode = 1;
    }

    try {
      await flushRequestAuditLog();
    } catch {
      console.error("Request audit log did not flush cleanly");
      process.exitCode = 1;
    }

    clearTimeout(forceExitTimer);
    process.exit();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  console.error("Fatal uncaught exception", { errorType: error.name });
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Fatal unhandled rejection", {
    errorType: reason instanceof Error ? reason.name : "UnknownRejection",
  });
  void shutdown("unhandledRejection");
});
