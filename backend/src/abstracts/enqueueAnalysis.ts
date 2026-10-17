import type { DatabaseExecutor } from "../types/database";

/** Intent is already committed through the existing submission audit event.
 * Isolate optional AI SQL so a PostgreSQL statement error cannot abort author submission.
 */
export async function enqueueAnalysisSafely(
  client: DatabaseExecutor,
  submissionId: string,
  historyId: string,
  enqueue?: (client: DatabaseExecutor, submissionId: string, historyId: string) => Promise<void>,
): Promise<void> {
  if (!enqueue) return;
  await client.query("SAVEPOINT abstract_ai_enqueue");
  try {
    await enqueue(client, submissionId, historyId);
  } catch {
    await client.query("ROLLBACK TO SAVEPOINT abstract_ai_enqueue");
    console.error("Abstract AI enqueue deferred", { code: "AI_ENQUEUE_DEFERRED", submissionId });
  }
  await client.query("RELEASE SAVEPOINT abstract_ai_enqueue");
}
