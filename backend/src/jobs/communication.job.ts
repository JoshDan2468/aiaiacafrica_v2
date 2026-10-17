import type { CommunicationService } from "../services/communication.service";

export function startCommunicationJob(
  service: CommunicationService,
): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void service
      .runDue()
      .catch(() =>
        console.error(
          "Communications scheduler failed; pending recipients retained",
        ),
      )
      .finally(() => {
        running = false;
      });
  }, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
